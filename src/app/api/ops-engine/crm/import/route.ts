import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { bulkInsertRows } from "@/lib/ops-engine/db";
import { getCrmConnector } from "@/lib/ops-engine/crm";
import type { CrmProvider, CrmConnectionConfig, CrmRecord } from "@/lib/ops-engine/crm";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = (await request.json()) as {
      workspace_id?: string;
      table_id?: string;
      provider?: string;
      import_type?: "contacts" | "companies";
      field_mapping?: Record<string, string>;
    };

    const { workspace_id, table_id, provider, import_type, field_mapping } =
      body;

    if (!workspace_id || !table_id || !provider || !import_type) {
      return NextResponse.json(
        {
          error:
            "workspace_id, table_id, provider, and import_type are required",
        },
        { status: 400 }
      );
    }

    const validProviders: CrmProvider[] = [
      "hubspot",
      "attio",
      "pipedrive",
      "folk",
    ];
    if (!validProviders.includes(provider as CrmProvider)) {
      return NextResponse.json(
        { error: `Invalid provider. Must be one of: ${validProviders.join(", ")}` },
        { status: 400 }
      );
    }

    if (import_type !== "contacts" && import_type !== "companies") {
      return NextResponse.json(
        { error: 'import_type must be "contacts" or "companies"' },
        { status: 400 }
      );
    }

    const crmProvider = provider as CrmProvider;

    // Get CRM connection config from workspace
    const supabase = createAdminClient();
    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .select("api_keys")
      .eq("id", workspace_id)
      .single();

    if (wsError) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    const apiKeys = (workspace.api_keys as Record<string, unknown>) ?? {};
    const crmConnections =
      (apiKeys.crm_connections as Record<string, Record<string, unknown>>) ??
      {};
    const connectionData = crmConnections[crmProvider];

    const config: CrmConnectionConfig = {
      provider: crmProvider,
      access_token: (connectionData?.access_token as string) ?? undefined,
      api_key: (connectionData?.api_key as string) ?? undefined,
    };

    // Import from CRM
    const connector = getCrmConnector(crmProvider);
    const result =
      import_type === "contacts"
        ? await connector.importContacts(config)
        : await connector.importCompanies(config);

    if (result.records.length === 0) {
      return NextResponse.json({
        imported: 0,
        errors: result.errors.length > 0 ? result.errors : ["No records found"],
      });
    }

    // Map CRM records to ops rows
    const rows = result.records.map((record: CrmRecord) => {
      let mappedData: Record<string, unknown>;

      if (field_mapping && Object.keys(field_mapping).length > 0) {
        // Apply custom field mapping: field_mapping maps CRM field -> ops column key
        mappedData = {};
        for (const [crmField, opsKey] of Object.entries(field_mapping)) {
          mappedData[opsKey] = record.data[crmField] ?? null;
        }
        // Always include company_name if available
        if (record.company_name && !mappedData.company_name) {
          mappedData.company_name = record.company_name;
        }
      } else {
        // No mapping — pass all CRM data through
        mappedData = {
          ...record.data,
          company_name: record.company_name ?? record.data.company_name ?? record.data.name ?? null,
        };
      }

      return {
        domain: record.domain ?? undefined,
        data: mappedData,
        source: "crm_import" as const,
        source_meta: {
          crm_provider: crmProvider,
          import_type,
          imported_at: new Date().toISOString(),
        },
      };
    });

    const insertResult = await bulkInsertRows(table_id, rows);

    return NextResponse.json({
      imported: insertResult.inserted,
      total_fetched: result.total_fetched,
      provider: crmProvider,
      import_type,
      errors: result.errors,
    });
  } catch (error) {
    console.error("CRM import error:", error);
    return NextResponse.json(
      { error: "Failed to import from CRM" },
      { status: 500 }
    );
  }
}
