import { NextRequest, NextResponse } from "next/server";
import { listMLSessions } from "@/lib/messaging-lab/db";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) {
    return NextResponse.json({ sessions: [] });
  }

  try {
    const sessions = await listMLSessions(workspaceId);
    return NextResponse.json({ sessions });
  } catch {
    return NextResponse.json({ sessions: [] });
  }
}
