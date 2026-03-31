import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRow, getColumns, updateRow } from "@/lib/ops-engine/db";
import { inngest } from "@/lib/ops-engine/inngest/client";
import type { OpsColumn, OpsRow, SignalInputConfig } from "@/lib/ops-engine/types";

/**
 * POST /api/ops-engine/webhooks/snitcher
 *
 * Receives Snitcher webhook payloads when a new company is identified
 * visiting your website. Automatically creates or updates rows in
 * tables configured with snitcher signal columns.
 *
 * Expected payload shape (Snitcher webhook):
 * {
 *   "session_id": string,
 *   "company": { "name": string, "domain": string, ... },
 *   "pages": string[],
 *   "visit_count": number,
 *   "referrer": string,
 *   "workspace_id": string  // custom field set in webhook config
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // Validate required fields
    const domain = payload.company?.domain;
    const workspaceId = payload.workspace_id;

    if (!domain) {
      return NextResponse.json(
        { error: "Missing company.domain in payload" },
        { status: 400 }
      );
    }

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Missing workspace_id in payload" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Find tables in this workspace that have snitcher signal columns
    const { data: tables, error: tablesError } = await supabase
      .from("ops_tables")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true);

    if (tablesError) throw tablesError;
    if (!tables || tables.length === 0) {
      return NextResponse.json(
        { message: "No active tables found for workspace" },
        { status: 200 }
      );
    }

    let rowsProcessed = 0;

    for (const table of tables) {
      // Check if this table has a snitcher signal column
      const columns = await getColumns(table.id);
      const snitcherColumn = columns.find(
        (c: OpsColumn) =>
          c.column_type === "signal_input" &&
          (c.config as SignalInputConfig).source === "snitcher"
      );

      if (!snitcherColumn) continue;

      // Check if a row with this domain already exists
      const { data: existingRows } = await supabase
        .from("ops_rows")
        .select("id, data, source_meta")
        .eq("table_id", table.id)
        .eq("domain", domain)
        .limit(1);

      const rowData: Record<string, unknown> = {
        company_name: payload.company?.name ?? domain,
        pages_visited: payload.pages ?? [],
        visit_count: payload.visit_count ?? 1,
        referrer: payload.referrer ?? "direct",
        country: payload.company?.country ?? null,
        industry: payload.company?.industry ?? null,
        employee_count: payload.company?.employee_count ?? null,
      };

      const sourceMeta: Record<string, unknown> = {
        snitcher_session_id: payload.session_id,
        webhook_received_at: new Date().toISOString(),
        raw_payload: payload,
      };

      if (existingRows && existingRows.length > 0) {
        // Update existing row — merge visit data
        const existing = existingRows[0];
        const existingData = (existing.data ?? {}) as Record<string, unknown>;
        const previousVisits = (existingData.visit_count as number) ?? 0;

        const mergedData = {
          ...existingData,
          ...rowData,
          visit_count: previousVisits + (payload.visit_count ?? 1),
          pages_visited: [
            ...new Set([
              ...((existingData.pages_visited as string[]) ?? []),
              ...(payload.pages ?? []),
            ]),
          ],
        };

        await updateRow(existing.id, {
          data: mergedData,
          source_meta: sourceMeta,
        } as Partial<OpsRow>);

        // Trigger re-enrichment
        await inngest.send({
          name: "ops/enrichment.requested",
          data: {
            row_id: existing.id,
            table_id: table.id,
            workspace_id: workspaceId,
          },
        });
      } else {
        // Create new row
        const newRow = await createRow(table.id, {
          domain,
          data: rowData,
          source: "snitcher",
          source_meta: sourceMeta,
        });

        // Trigger enrichment
        await inngest.send({
          name: "ops/enrichment.requested",
          data: {
            row_id: newRow.id,
            table_id: table.id,
            workspace_id: workspaceId,
          },
        });
      }

      rowsProcessed++;
    }

    return NextResponse.json({
      success: true,
      domain,
      tables_processed: rowsProcessed,
    });
  } catch (error) {
    console.error("[snitcher-webhook] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
