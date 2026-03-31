import { tool } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ScoringConfig } from "./types";

// ── Factory: creates tools with workspace_id in closure ──

export function createOpsAgentTools(workspaceId: string) {
  return {
    create_table: tool({
      description:
        "Create a new ops table in the workspace. Always do this first before adding columns or rows.",
      inputSchema: z.object({
        name: z.string().describe("Human-readable table name"),
        description: z
          .string()
          .optional()
          .describe("Brief description of what this table tracks"),
      }),
      execute: async ({ name, description }) => {
        const supabase = createAdminClient();
        const { data, error } = await supabase
          .from("ops_tables")
          .insert({
            workspace_id: workspaceId,
            name,
            description: description ?? null,
          })
          .select("id, name")
          .single();
        if (error) throw new Error(`Failed to create table: ${error.message}`);
        return { table_id: data.id, name: data.name };
      },
    }),

    add_column: tool({
      description:
        "Add a column to an ops table. Column types: signal_input (data source like Crunchbase, LinkedIn Jobs), enricher (data enrichment via Apollo, Hunter, etc. with waterfall config), ai_column (LLM-generated analysis), formula (calculated field), static (manual data).",
      inputSchema: z.object({
        table_id: z.string().describe("The table to add the column to"),
        name: z.string().describe("Human-readable column name"),
        key: z
          .string()
          .describe(
            "Machine-readable key, lowercase with underscores (e.g. company_name, funding_amount)"
          ),
        column_type: z.enum([
          "signal_input",
          "enricher",
          "ai_column",
          "formula",
          "static",
        ]),
        config: z
          .record(z.string(), z.unknown())
          .optional()
          .describe(
            "Column-specific configuration. For signal_input: {source, filters}. For enricher: {waterfall: [{provider, fields}], cache_ttl_days}. For ai_column: {prompt, model, output_type}. For formula: {expression, output_type}."
          ),
        position: z
          .number()
          .optional()
          .describe("Column position (0-indexed). Auto-incremented if omitted."),
      }),
      execute: async ({ table_id, name, key, column_type, config, position }) => {
        const supabase = createAdminClient();

        // Auto-calculate position if not provided
        let pos = position;
        if (pos === undefined) {
          const { count } = await supabase
            .from("ops_columns")
            .select("*", { count: "exact", head: true })
            .eq("table_id", table_id);
          pos = count ?? 0;
        }

        const { data, error } = await supabase
          .from("ops_columns")
          .insert({
            table_id,
            name,
            key,
            column_type,
            config: config ?? {},
            position: pos,
          })
          .select("id, name, column_type")
          .single();
        if (error) throw new Error(`Failed to add column: ${error.message}`);
        return {
          column_id: data.id,
          name: data.name,
          type: data.column_type,
        };
      },
    }),

    configure_scoring: tool({
      description:
        "Set scoring rules and tier thresholds for a table. Each rule awards or deducts points based on a column value. Thresholds define the score ranges for each tier (ignored, cold, warm, hot, priority).",
      inputSchema: z.object({
        table_id: z.string(),
        rules: z.array(
          z.object({
            label: z.string().describe("Human-readable rule description"),
            column_key: z
              .string()
              .describe("The column key this rule evaluates"),
            operator: z
              .string()
              .describe(
                "Operator: equals, not_equals, contains, not_contains, greater_than, less_than, within_days, matches_list, is_empty, is_not_empty, ai_evaluation"
              ),
            value: z
              .union([z.string(), z.number(), z.array(z.string())])
              .describe("The value to compare against"),
            score_impact: z
              .number()
              .describe(
                "Points to add (positive) or deduct (negative) when rule matches"
              ),
          })
        ),
        thresholds: z
          .object({
            ignored: z.number().default(0),
            cold: z.number().default(20),
            warm: z.number().default(40),
            hot: z.number().default(70),
            priority: z.number().default(85),
          })
          .optional(),
      }),
      execute: async ({ table_id, rules, thresholds }) => {
        const supabase = createAdminClient();

        const scoringConfig: ScoringConfig = {
          rules: rules.map((r, i) => ({
            id: `rule_${i + 1}`,
            label: r.label,
            column_key: r.column_key,
            operator: r.operator as ScoringConfig["rules"][number]["operator"],
            value: r.value,
            score_impact: r.score_impact,
          })),
          thresholds: thresholds ?? {
            ignored: 0,
            cold: 20,
            warm: 40,
            hot: 70,
            priority: 85,
          },
        };

        const { error } = await supabase
          .from("ops_tables")
          .update({ scoring_config: scoringConfig })
          .eq("id", table_id);
        if (error)
          throw new Error(`Failed to configure scoring: ${error.message}`);

        return {
          rules_count: rules.length,
          thresholds: scoringConfig.thresholds,
        };
      },
    }),

    add_rows: tool({
      description:
        "Add rows to a table from inline data. Each row is an object with column keys as properties. Use the domain field for company website domains when available.",
      inputSchema: z.object({
        table_id: z.string(),
        rows: z
          .array(z.record(z.string(), z.unknown()))
          .describe(
            "Array of row data objects. Keys should match column keys defined in the table."
          ),
      }),
      execute: async ({ table_id, rows }) => {
        const supabase = createAdminClient();
        const payload = rows.map((row) => ({
          table_id,
          data: row,
          domain:
            typeof row.domain === "string"
              ? row.domain
              : typeof row.website === "string"
                ? row.website
                : null,
          source: "manual" as const,
          source_meta: {},
        }));

        const { data, error } = await supabase
          .from("ops_rows")
          .insert(payload)
          .select("id");
        if (error) throw new Error(`Failed to add rows: ${error.message}`);
        return { inserted: data?.length ?? 0 };
      },
    }),

    trigger_enrichment: tool({
      description:
        "Start enriching all rows in a table. This marks rows as 'enriching' and dispatches enrichment jobs.",
      inputSchema: z.object({
        table_id: z.string(),
      }),
      execute: async ({ table_id }) => {
        const supabase = createAdminClient();

        // Count rows to enrich
        const { count, error: countError } = await supabase
          .from("ops_rows")
          .select("*", { count: "exact", head: true })
          .eq("table_id", table_id)
          .in("status", ["new", "scored"]);
        if (countError)
          throw new Error(
            `Failed to count rows: ${countError.message}`
          );

        // Mark rows as enriching
        const { error } = await supabase
          .from("ops_rows")
          .update({ status: "enriching" })
          .eq("table_id", table_id)
          .in("status", ["new", "scored"]);
        if (error)
          throw new Error(
            `Failed to trigger enrichment: ${error.message}`
          );

        // In production: dispatch Inngest events here
        return {
          rows_queued: count ?? 0,
          status: "enrichment_started",
          message: `${count ?? 0} rows queued for enrichment`,
        };
      },
    }),

    search_web: tool({
      description:
        "Search the web for companies matching criteria. Use this to find prospect data before adding rows to a table.",
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            "Search query to find companies (e.g. 'French fintech Series A 2025')"
          ),
      }),
      execute: async ({ query }) => {
        // Stub: return mock search results
        // In production: use Serper API via workspace API keys
        return {
          query,
          results: [
            {
              company: "Example Fintech SAS",
              domain: "example-fintech.com",
              description: "French fintech startup, Series A Q1 2025",
              funding: "Series A - 12M EUR",
              location: "Paris, France",
            },
            {
              company: "PayFlow Technologies",
              domain: "payflow.io",
              description: "Payment infrastructure for European SMBs",
              funding: "Series A - 8M EUR",
              location: "Lyon, France",
            },
            {
              company: "FinStack",
              domain: "finstack.eu",
              description: "Open banking platform",
              funding: "Series A - 15M EUR",
              location: "Paris, France",
            },
          ],
          note: "These are mock results. Connect the Serper API for real web search.",
        };
      },
    }),
  };
}

export type OpsAgentTools = ReturnType<typeof createOpsAgentTools>;
