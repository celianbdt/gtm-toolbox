import { inngest } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getTable,
  getColumns,
  getRow,
  createRow,
  updateRow,
  listAutomations,
} from "../db";
import { runWaterfall } from "../enrichment/waterfall";
import type { WaterfallResult } from "../enrichment/waterfall";
import { scoreRow } from "../scoring";
import { checkBudget } from "../cost";
import { getSignalHandler } from "../signals";
import type {
  OpsRow,
  OpsTable,
  OpsColumn,
  SignalInputConfig,
  EnricherColumnConfig,
  ThresholdTier,
} from "../types";
import type { EnrichmentField } from "../enrichment/types";

// ── 1. Signal Harvest (daily cron at 06:00 UTC) ──

export const signalHarvestJob = inngest.createFunction(
  {
    id: "signal-harvest",
    name: "Signal Harvest",
    triggers: [{ cron: "0 6 * * *" }],
  },
  async ({ step }) => {
    const supabase = createAdminClient();

    // Fetch all active tables
    const tables = await step.run("fetch-active-tables", async () => {
      const { data, error } = await supabase
        .from("ops_tables")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return (data ?? []) as OpsTable[];
    });

    for (const table of tables) {
      // Get signal_input columns for this table
      const signalColumns = await step.run(
        `fetch-signal-columns-${table.id}`,
        async () => {
          const columns = await getColumns(table.id);
          return columns.filter(
            (c: OpsColumn) => c.column_type === "signal_input"
          );
        }
      );

      for (const col of signalColumns) {
        const config = col.config as SignalInputConfig;
        const handler = getSignalHandler(config.source);
        if (!handler) {
          console.warn(
            `[signal-harvest] No handler for source: ${config.source}`
          );
          continue;
        }

        const results = await step.run(
          `harvest-${table.id}-${col.key}`,
          async () => {
            // Fetch workspace API keys for this source
            const { data: workspace } = await supabase
              .from("workspaces")
              .select("api_keys")
              .eq("id", table.workspace_id)
              .single();

            const apiKeys = workspace?.api_keys as
              | Record<string, string>
              | undefined;
            const apiKey = apiKeys?.[config.source];

            return handler.harvest(config.filters, apiKey);
          }
        );

        // Insert new rows from signal results
        let rowsCreated = 0;
        for (const result of results) {
          await step.run(
            `insert-row-${table.id}-${result.domain}`,
            async () => {
              const newRow = await createRow(table.id, {
                domain: result.domain,
                data: result.data,
                source: config.source,
                source_meta: result.source_meta,
              });

              rowsCreated++;

              // Trigger enrichment for each new row
              await inngest.send({
                name: "ops/enrichment.requested",
                data: {
                  row_id: newRow.id,
                  table_id: table.id,
                  workspace_id: table.workspace_id,
                },
              });

              return newRow.id;
            }
          );
        }

        // Emit harvest completion event
        if (rowsCreated > 0) {
          await step.run(`emit-harvest-${table.id}-${col.key}`, async () => {
            await inngest.send({
              name: "ops/signal.harvested",
              data: {
                table_id: table.id,
                workspace_id: table.workspace_id,
                source: config.source,
                rows_created: rowsCreated,
              },
            });
          });
        }
      }
    }

    return { status: "completed", tables_processed: tables.length };
  }
);

// ── 2. Enrichment Run (event-driven, concurrency: 5) ──

export const enrichmentJob = inngest.createFunction(
  {
    id: "enrichment-run",
    name: "Enrichment Run",
    concurrency: { limit: 5 },
    triggers: [{ event: "ops/enrichment.requested" }],
  },
  async ({ event, step }) => {
    const { row_id, table_id, workspace_id } = event.data as {
      row_id: string;
      table_id: string;
      workspace_id: string;
    };

    // Fetch row and table
    const { row, table } = await step.run("fetch-row-table", async () => {
      const [r, t] = await Promise.all([getRow(row_id), getTable(table_id)]);
      return { row: r, table: t };
    });

    // Check budget
    const budget = await step.run("check-budget", async () => {
      return checkBudget(workspace_id);
    });

    if (!budget.within_budget) {
      console.warn(
        `[enrichment] Budget exceeded for workspace ${workspace_id}. Used: ${budget.used}/${budget.limit}`
      );
      return { status: "skipped", reason: "budget_exceeded" };
    }

    // Check enrichment threshold — skip if score is below threshold
    if (
      table.settings.enrichment_threshold > 0 &&
      row.score_total < table.settings.enrichment_threshold
    ) {
      console.log(
        `[enrichment] Row ${row_id} score (${row.score_total}) below threshold (${table.settings.enrichment_threshold})`
      );
      return { status: "skipped", reason: "below_threshold" };
    }

    // Get enricher columns for this table
    const enricherColumns = await step.run(
      "fetch-enricher-columns",
      async () => {
        const columns = await getColumns(table_id);
        return columns.filter((c: OpsColumn) => c.column_type === "enricher");
      }
    );

    if (enricherColumns.length === 0) {
      return { status: "skipped", reason: "no_enricher_columns" };
    }

    // Update row status to enriching
    await step.run("set-status-enriching", async () => {
      await updateRow(row_id, { status: "enriching" } as Partial<OpsRow>);
    });

    // Fetch workspace API keys
    const apiKeys = await step.run("fetch-api-keys", async () => {
      const supabase = createAdminClient();
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("api_keys")
        .eq("id", workspace_id)
        .single();
      return (workspace?.api_keys ?? {}) as Record<string, string>;
    });

    // Run waterfall for each enricher column
    const mergedData: Record<string, unknown> = { ...row.data };

    for (const col of enricherColumns) {
      const colConfig = col.config as EnricherColumnConfig;
      if (!colConfig.waterfall || colConfig.waterfall.length === 0) continue;

      // Determine which fields this column expects
      const allFields = colConfig.waterfall.flatMap(
        (s) => s.fields
      ) as EnrichmentField[];
      const uniqueFields = [...new Set(allFields)];

      const waterfallResult: WaterfallResult = await step.run(
        `waterfall-${col.key}`,
        async () => {
          return runWaterfall(
            colConfig.waterfall,
            {
              domain: row.domain ?? "",
              fields: uniqueFields,
            },
            apiKeys,
            workspace_id
          );
        }
      );

      // Merge resolved fields into row data
      for (const [field, resolved] of Object.entries(
        waterfallResult.resolved
      )) {
        if (resolved) {
          mergedData[field] = resolved.value;
        }
      }
    }

    // Update row with merged enrichment data
    await step.run("update-row-data", async () => {
      await updateRow(row_id, {
        data: mergedData,
        status: "scored",
        last_enriched_at: new Date().toISOString(),
      } as Partial<OpsRow>);
    });

    // Send scoring event
    await step.run("send-scoring-event", async () => {
      await inngest.send({
        name: "ops/scoring.requested",
        data: { row_id, table_id },
      });
    });

    return { status: "completed", row_id };
  }
);

// ── 3. Scoring Run (event-driven) ──

export const scoringJob = inngest.createFunction(
  {
    id: "scoring-run",
    name: "Scoring Run",
    triggers: [{ event: "ops/scoring.requested" }],
  },
  async ({ event, step }) => {
    const { row_id, table_id } = event.data as {
      row_id: string;
      table_id: string;
    };

    const result = await step.run("score-row", async () => {
      const [row, table] = await Promise.all([
        getRow(row_id),
        getTable(table_id),
      ]);

      const previousTier = row.score_tier;
      const scoreResult = await scoreRow(row, table.scoring_config);

      return {
        ...scoreResult,
        previous_tier: previousTier,
      };
    });

    // If tier changed upward, trigger automation
    const tierOrder: ThresholdTier[] = [
      "ignored",
      "cold",
      "warm",
      "hot",
      "priority",
    ];
    const previousIdx = tierOrder.indexOf(result.previous_tier);
    const newIdx = tierOrder.indexOf(result.tier);

    if (result.changed && newIdx > previousIdx) {
      await step.run("trigger-automation", async () => {
        await inngest.send({
          name: "ops/automation.triggered",
          data: {
            row_id,
            table_id,
            new_tier: result.tier,
            previous_tier: result.previous_tier,
          },
        });
      });
    }

    return {
      status: "completed",
      row_id,
      score: result.score,
      tier: result.tier,
      changed: result.changed,
    };
  }
);

// ── 4. Automation Run (event-driven) ──

export const automationJob = inngest.createFunction(
  {
    id: "automation-run",
    name: "Automation Run",
    triggers: [{ event: "ops/automation.triggered" }],
  },
  async ({ event, step }) => {
    const { row_id, table_id, new_tier } = event.data as {
      row_id: string;
      table_id: string;
      new_tier: string;
      previous_tier: string;
    };

    // Fetch active automations matching this tier
    const automations = await step.run("fetch-automations", async () => {
      const all = await listAutomations(table_id);
      return all.filter(
        (a) =>
          a.is_active && a.trigger_tier === (new_tier as ThresholdTier)
      );
    });

    if (automations.length === 0) {
      return { status: "completed", reason: "no_matching_automations" };
    }

    // Execute each automation (stub: log for now, real execution in Sprint 5)
    for (const automation of automations) {
      await step.run(`execute-${automation.id}`, async () => {
        console.log(
          `[automation] Would execute "${automation.name}" (${automation.automation_type}) for row ${row_id} — tier: ${new_tier}`,
          { config: automation.config }
        );
        // TODO Sprint 5: implement actual automation execution
        // - slack_webhook: POST to webhook URL
        // - email_digest: queue email
        // - hubspot_push: create/update CRM contact
        // - lemlist_push: add lead to campaign
        // - instantly_push: add lead to campaign
        // - smartlead_push: add lead to campaign
        // - custom_webhook: POST to user-defined URL
      });
    }

    // Update row status to actioned
    await step.run("set-status-actioned", async () => {
      await updateRow(row_id, { status: "actioned" } as Partial<OpsRow>);
    });

    return {
      status: "completed",
      row_id,
      automations_executed: automations.length,
    };
  }
);

// ── 5. Weekly Digest (Monday 09:00 UTC) ──

export const weeklyDigestJob = inngest.createFunction(
  {
    id: "weekly-digest",
    name: "Weekly Digest",
    triggers: [{ cron: "0 9 * * 1" }],
  },
  async ({ step }) => {
    const supabase = createAdminClient();

    // Fetch all workspaces with active tables
    const workspaces = await step.run("fetch-workspaces", async () => {
      const { data, error } = await supabase
        .from("ops_tables")
        .select("workspace_id")
        .eq("is_active", true);
      if (error) throw error;

      // Deduplicate workspace IDs
      const ids = [
        ...new Set((data ?? []).map((t: { workspace_id: string }) => t.workspace_id)),
      ];
      return ids as string[];
    });

    const digests: Array<{
      workspace_id: string;
      new_rows: number;
      score_changes: number;
      hot_count: number;
      priority_count: number;
    }> = [];

    for (const workspaceId of workspaces) {
      const stats = await step.run(
        `compile-stats-${workspaceId}`,
        async () => {
          const oneWeekAgo = new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000
          ).toISOString();

          // Get table IDs for this workspace
          const tableIds =
            (
              await supabase
                .from("ops_tables")
                .select("id")
                .eq("workspace_id", workspaceId)
                .eq("is_active", true)
            ).data?.map((t: { id: string }) => t.id) ?? [];

          // Count new rows this week
          const { count: newRows } = await supabase
            .from("ops_rows")
            .select("id", { count: "exact", head: true })
            .gte("created_at", oneWeekAgo)
            .in("table_id", tableIds);

          // Count score changes this week
          const rowIds =
            (
              await supabase
                .from("ops_rows")
                .select("id")
                .in("table_id", tableIds)
            ).data?.map((r: { id: string }) => r.id) ?? [];

          const { count: scoreChanges } = await supabase
            .from("ops_score_history")
            .select("id", { count: "exact", head: true })
            .gte("created_at", oneWeekAgo)
            .in("row_id", rowIds);

          // Count hot and priority rows
          const { count: hotCount } = await supabase
            .from("ops_rows")
            .select("id", { count: "exact", head: true })
            .in("table_id", tableIds)
            .eq("score_tier", "hot");

          const { count: priorityCount } = await supabase
            .from("ops_rows")
            .select("id", { count: "exact", head: true })
            .in("table_id", tableIds)
            .eq("score_tier", "priority");

          return {
            workspace_id: workspaceId,
            new_rows: newRows ?? 0,
            score_changes: scoreChanges ?? 0,
            hot_count: hotCount ?? 0,
            priority_count: priorityCount ?? 0,
          };
        }
      );

      digests.push(stats);

      // Log digest (actual email sending will be Sprint 5)
      console.log(`[weekly-digest] Workspace ${workspaceId}:`, stats);
    }

    return { status: "completed", digests };
  }
);

// ── 6. Cleanup (Sunday 03:00 UTC) ──

export const cleanupJob = inngest.createFunction(
  {
    id: "cleanup",
    name: "Cleanup",
    triggers: [{ cron: "0 3 * * 0" }],
  },
  async ({ step }) => {
    const supabase = createAdminClient();

    // Archive rows older than 90 days that are not already archived
    const archived = await step.run("archive-old-rows", async () => {
      const cutoff = new Date(
        Date.now() - 90 * 24 * 60 * 60 * 1000
      ).toISOString();

      const { data, error } = await supabase
        .from("ops_rows")
        .update({ status: "archived" })
        .lt("updated_at", cutoff)
        .neq("status", "archived")
        .select("id");

      if (error) {
        console.error("[cleanup] Failed to archive old rows:", error);
        return 0;
      }

      return data?.length ?? 0;
    });

    // Purge expired enrichment cache entries
    const purged = await step.run("purge-expired-cache", async () => {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("ops_enrichment_cache")
        .delete()
        .lt("expires_at", now)
        .select("id");

      if (error) {
        console.error("[cleanup] Failed to purge expired cache:", error);
        return 0;
      }

      return data?.length ?? 0;
    });

    console.log(
      `[cleanup] Archived ${archived} rows, purged ${purged} cache entries`
    );

    return {
      status: "completed",
      archived_rows: archived,
      purged_cache: purged,
    };
  }
);
