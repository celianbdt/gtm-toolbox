import { NextRequest, NextResponse } from "next/server";
import { listDebateSessions } from "@/lib/debate/db";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) {
    return NextResponse.json({ sessions: [] });
  }

  try {
    const sessions = await listDebateSessions(workspaceId);
    return NextResponse.json({ sessions });
  } catch {
    return NextResponse.json({ sessions: [] });
  }
}
