import { NextRequest, NextResponse } from "next/server";
import { getSession, getAgentsByIds } from "@/lib/debate/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession(id);
    const agents = await getAgentsByIds(session.config.agent_ids);
    return NextResponse.json({ session, agents });
  } catch (error) {
    console.error("Failed to get session:", error);
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
}
