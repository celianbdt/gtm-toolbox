import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getIntegrationConnector } from "@/lib/integrations/registry";
import type { IntegrationProvider } from "@/lib/integrations/types";

const CRM_PROVIDERS = new Set(["hubspot", "pipedrive", "attio", "folk"]);

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { workspace_id, provider, credentials } = body as {
    workspace_id: string;
    provider: IntegrationProvider;
    credentials: Record<string, unknown>;
  };

  if (!workspace_id || !provider || !credentials) {
    return NextResponse.json(
      { error: "workspace_id, provider, and credentials are required" },
      { status: 400 }
    );
  }

  // Test connection
  let connector;
  try {
    connector = getIntegrationConnector(provider);
  } catch {
    return NextResponse.json(
      { error: `Provider ${provider} is not yet supported` },
      { status: 400 }
    );
  }

  const isValid = await connector.testConnection(credentials);
  if (!isValid) {
    return NextResponse.json(
      { error: "Connection test failed — check your credentials" },
      { status: 422 }
    );
  }

  const supabase = createAdminClient();

  // Upsert integration (ON CONFLICT workspace_id, provider)
  const { data: integration, error: upsertError } = await supabase
    .from("integrations")
    .upsert(
      {
        workspace_id,
        provider,
        credentials,
        status: "connected",
        error_message: null,
      },
      { onConflict: "workspace_id,provider" }
    )
    .select("*")
    .single();

  if (upsertError) {
    console.error("Failed to upsert integration:", upsertError);
    return NextResponse.json({ error: "Failed to save integration" }, { status: 500 });
  }

  // Backward compat: update workspace.api_keys.crm_connections for CRM providers
  if (CRM_PROVIDERS.has(provider)) {
    try {
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("api_keys")
        .eq("id", workspace_id)
        .single();

      const apiKeys = (workspace?.api_keys as Record<string, unknown>) ?? {};
      const crmConnections = (apiKeys.crm_connections as Record<string, unknown>) ?? {};

      crmConnections[provider] = {
        access_token: credentials.access_token,
        connected_at: new Date().toISOString(),
      };

      await supabase
        .from("workspaces")
        .update({ api_keys: { ...apiKeys, crm_connections: crmConnections } })
        .eq("id", workspace_id);
    } catch (err) {
      console.error("Failed to update workspace api_keys for backward compat:", err);
    }
  }

  return NextResponse.json({ integration });
}
