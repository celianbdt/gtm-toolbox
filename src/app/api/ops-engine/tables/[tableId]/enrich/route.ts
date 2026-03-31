import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { triggerEnrichmentSchema } from "@/lib/ops-engine/schemas";
import {
  getTable,
  getColumns,
  getRows,
  getRow,
  updateRow,
  upsertCellValue,
} from "@/lib/ops-engine/db";
import { runWaterfall } from "@/lib/ops-engine/enrichment/waterfall";
import { checkBudget } from "@/lib/ops-engine/cost";
import type {
  EnricherColumnConfig,
  OpsRow,
  OpsColumn,
  ThresholdTier,
} from "@/lib/ops-engine/types";
import type { EnrichmentField } from "@/lib/ops-engine/enrichment/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { tableId } = await params;
    const body = await request.json();

    // Validate body
    const parsed = triggerEnrichmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Get table and enricher columns
    const table = await getTable(tableId);
    const columns = await getColumns(tableId);
    const enricherColumns = columns.filter(
      (col) => col.column_type === "enricher"
    );

    if (enricherColumns.length === 0) {
      return NextResponse.json(
        { error: "No enricher columns configured on this table" },
        { status: 400 }
      );
    }

    // Check budget
    const budget = await checkBudget(table.workspace_id);
    if (!budget.within_budget) {
      return NextResponse.json(
        {
          error: "Monthly enrichment budget exceeded",
          used: budget.used,
          limit: budget.limit,
        },
        { status: 429 }
      );
    }

    // Resolve target rows
    let targetRows: OpsRow[] = [];

    if (parsed.data.row_ids?.length) {
      // Specific rows
      const rowPromises = parsed.data.row_ids.map((id) => getRow(id));
      targetRows = await Promise.all(rowPromises);
    } else if (parsed.data.all) {
      // All rows
      const result = await getRows(tableId, {
        page: 1,
        limit: 10000,
        sort: "created_at",
        order: "desc",
      });
      targetRows = result.rows;
    } else if (parsed.data.tier_filter) {
      // Rows matching tier filter
      const result = await getRows(tableId, {
        page: 1,
        limit: 10000,
        sort: "created_at",
        order: "desc",
        tier: parsed.data.tier_filter as ThresholdTier,
      });
      targetRows = result.rows;
    } else {
      return NextResponse.json(
        { error: "Provide row_ids, all: true, or tier_filter" },
        { status: 400 }
      );
    }

    if (targetRows.length === 0) {
      return NextResponse.json({ rows_enriched: 0, credits_used: 0 });
    }

    // Get workspace API keys
    const workspaceApiKeys = await getWorkspaceApiKeys(table.workspace_id);

    let totalCredits = 0;
    let rowsEnriched = 0;

    // Process each row
    for (const row of targetRows) {
      if (!row.domain) continue;

      // Mark row as enriching
      await updateRow(row.id, { status: "enriching" });

      let rowCredits = 0;

      // Run waterfall for each enricher column
      for (const col of enricherColumns) {
        const config = col.config as EnricherColumnConfig;
        const fields = extractFieldsFromWaterfall(config);

        const result = await runWaterfall(
          config.waterfall,
          {
            domain: row.domain,
            name: (row.data as Record<string, string>).name,
            email: (row.data as Record<string, string>).email,
            linkedin_url: (row.data as Record<string, string>).linkedin_url,
            fields,
          },
          workspaceApiKeys,
          table.workspace_id
        );

        rowCredits += result.total_credits;

        // Store resolved fields as cell values
        for (const [field, resolvedField] of Object.entries(result.resolved)) {
          if (!resolvedField) continue;

          await upsertCellValue(row.id, col.id, {
            value:
              typeof resolvedField.value === "object"
                ? JSON.stringify(resolvedField.value)
                : String(resolvedField.value),
            raw_value: { field, ...resolvedField },
            source: resolvedField.source,
            confidence: resolvedField.confidence,
          });
        }
      }

      // Mark row as scored
      await updateRow(row.id, {
        status: "scored",
      });

      totalCredits += rowCredits;
      rowsEnriched++;
    }

    return NextResponse.json({
      rows_enriched: rowsEnriched,
      credits_used: totalCredits,
    });
  } catch (error) {
    console.error("Failed to trigger enrichment:", error);
    return NextResponse.json(
      { error: "Failed to trigger enrichment" },
      { status: 500 }
    );
  }
}

// ── Helpers ──

function extractFieldsFromWaterfall(
  config: EnricherColumnConfig
): EnrichmentField[] {
  const fields = new Set<string>();
  for (const step of config.waterfall) {
    for (const f of step.fields) {
      fields.add(f);
    }
  }
  return Array.from(fields) as EnrichmentField[];
}

async function getWorkspaceApiKeys(
  workspaceId: string
): Promise<Record<string, string>> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("workspaces")
    .select("api_keys")
    .eq("id", workspaceId)
    .single();

  if (!data?.api_keys) return {};

  const keys = data.api_keys as Record<string, unknown>;
  const result: Record<string, string> = {};

  // Extract provider keys from workspace api_keys JSONB
  // Expected shape: { apollo: "key", clearbit: "key", ... }
  for (const [key, value] of Object.entries(keys)) {
    if (typeof value === "string") {
      result[key] = value;
    }
  }

  return result;
}
