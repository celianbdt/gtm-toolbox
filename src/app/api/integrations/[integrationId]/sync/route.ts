import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { inngest } from "@/lib/ops-engine/inngest/client";

type RouteParams = { params: Promise<{ integrationId: string }> };

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { integrationId } = await params;
  const supabase = createAdminClient();

  // Verify integration exists
  const { data: integration, error } = await supabase
    .from("integrations")
    .select("id, workspace_id, provider")
    .eq("id", integrationId)
    .single();

  if (error || !integration) {
    return NextResponse.json({ error: "Integration not found" }, { status: 404 });
  }

  // Dispatch Inngest event
  await inngest.send({
    name: "integration/sync.requested",
    data: {
      integration_id: integration.id,
      workspace_id: integration.workspace_id,
      provider: integration.provider,
    },
  });

  return NextResponse.json({ status: "sync_started" });
}
