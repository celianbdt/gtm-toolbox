import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { listSlackChannels } from "@/lib/integrations/connectors/slack";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: integration } = await supabase
      .from("integrations")
      .select("credentials")
      .eq("workspace_id", workspaceId)
      .eq("provider", "slack")
      .single();

    if (!integration) {
      return NextResponse.json({ error: "Slack not connected" }, { status: 404 });
    }

    const token = (integration.credentials as Record<string, unknown>).access_token as string
      ?? (integration.credentials as Record<string, unknown>).api_key as string;

    if (!token) {
      return NextResponse.json({ error: "No Slack token found" }, { status: 400 });
    }

    const channels = await listSlackChannels(token);
    return NextResponse.json({
      channels: channels.map((c) => ({
        id: c.id,
        name: c.name,
        is_private: c.is_private,
        num_members: c.num_members,
        topic: c.topic?.value ?? "",
      })),
    });
  } catch (error) {
    console.error("Failed to list Slack channels:", error);
    return NextResponse.json({ error: "Failed to list channels" }, { status: 500 });
  }
}
