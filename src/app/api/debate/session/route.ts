import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/debate/db";
import { requireWorkspaceMember } from "@/lib/supabase/auth";

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

    const auth = await requireWorkspaceMember(workspaceId);
    if (auth.error) return auth.error;

    // Input validation
    if (mission.length > 5000) {
      return NextResponse.json({ error: "Mission must be under 5000 characters" }, { status: 400 });
    }
    if (maxTurns && maxTurns > 20) {
      return NextResponse.json({ error: "maxTurns must be 20 or less" }, { status: 400 });
    }
    if (agentIds.length > 10) {
      return NextResponse.json({ error: "Maximum 10 agents allowed" }, { status: 400 });
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
