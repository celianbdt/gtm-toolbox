import { NextRequest, NextResponse } from "next/server";
import { listCPSessions } from "@/lib/channel-planner/db";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) {
    return NextResponse.json({ sessions: [] });
  }

  try {
    const sessions = await listCPSessions(workspaceId);
    return NextResponse.json({ sessions });
  } catch {
    return NextResponse.json({ sessions: [] });
  }
}
