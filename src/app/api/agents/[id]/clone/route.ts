import { NextRequest, NextResponse } from "next/server";
import { cloneAgentToWorkspace } from "@/lib/agents/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { workspaceId } = body as { workspaceId: string };

    if (!workspaceId) {
      return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
    }

    const agent = await cloneAgentToWorkspace(id, workspaceId);
    return NextResponse.json({ agent });
  } catch (error) {
    console.error("Failed to clone agent:", error);
    return NextResponse.json({ error: "Failed to clone agent" }, { status: 500 });
  }
}
