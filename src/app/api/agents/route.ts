import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceAgents, createAgent } from "@/lib/agents/db";
import { requireWorkspaceMember } from "@/lib/supabase/auth";
import type { AgentConfig } from "@/lib/debate/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
    }

    const auth = await requireWorkspaceMember(workspaceId);
    if (auth.error) return auth.error;

    const agents = await getWorkspaceAgents(workspaceId);
    return NextResponse.json({ agents });
  } catch (error) {
    console.error("Failed to fetch agents:", error);
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspace_id } = body as { workspace_id: string };

    const auth = await requireWorkspaceMember(workspace_id);
    if (auth.error) return auth.error;

    const agent = await createAgent(body as Omit<AgentConfig, "id">);
    return NextResponse.json({ agent });
  } catch (error) {
    console.error("Failed to create agent:", error);
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 });
  }
}
