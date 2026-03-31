import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCrmConnector } from "@/lib/ops-engine/crm";
import type { CrmProvider, CrmConnectionConfig } from "@/lib/ops-engine/crm";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = (await request.json()) as {
      workspace_id?: string;
      provider?: string;
      access_token?: string;
      api_key?: string;
    };

    const { workspace_id, provider, access_token, api_key } = body;

    if (!workspace_id || !provider) {
      return NextResponse.json(
        { error: "workspace_id and provider are required" },
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

    const crmProvider = provider as CrmProvider;
    const config: CrmConnectionConfig = {
      provider: crmProvider,
      access_token,
      api_key,
    };

    // Test the connection
    const connector = getCrmConnector(crmProvider);
    const connected = await connector.testConnection(config);

    // Read current workspace to get existing api_keys
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

    // Update api_keys JSONB with crm_connections
    const existingKeys = (workspace.api_keys as Record<string, unknown>) ?? {};
    const existingCrmConnections =
      (existingKeys.crm_connections as Record<string, unknown>) ?? {};

    const updatedKeys = {
      ...existingKeys,
      crm_connections: {
        ...existingCrmConnections,
        [crmProvider]: {
          provider: crmProvider,
          access_token: access_token ?? null,
          api_key: api_key ?? null,
          connected_at: new Date().toISOString(),
          is_connected: connected,
        },
      },
    };

    const { error: updateError } = await supabase
      .from("workspaces")
      .update({ api_keys: updatedKeys })
      .eq("id", workspace_id);

    if (updateError) {
      console.error("Failed to update workspace api_keys:", updateError);
      return NextResponse.json(
        { error: "Failed to store CRM connection" },
        { status: 500 }
      );
    }

    return NextResponse.json({ connected, provider: crmProvider });
  } catch (error) {
    console.error("CRM connect error:", error);
    return NextResponse.json(
      { error: "Failed to connect CRM" },
      { status: 500 }
    );
  }
}
