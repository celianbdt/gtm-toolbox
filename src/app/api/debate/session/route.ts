import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/debate/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, mission, maxTurns, agentIds, insightSessionIds } = body as {
      workspaceId: string;
      mission: string;
      maxTurns: number;
      agentIds: string[];
      insightSessionIds?: string[];
    };

    if (!workspaceId || !mission || !agentIds?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const session = await createSession({
      workspace_id: workspaceId,
      mission,
      max_turns: maxTurns ?? 10,
      agent_ids: agentIds,
      insight_session_ids: insightSessionIds,
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Failed to create session:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
