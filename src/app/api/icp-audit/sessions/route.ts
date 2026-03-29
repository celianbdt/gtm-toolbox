import { NextRequest, NextResponse } from "next/server";
import { listICASessions } from "@/lib/icp-audit/db";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) {
    return NextResponse.json({ sessions: [] });
  }

  try {
    const sessions = await listICASessions(workspaceId);
    return NextResponse.json({ sessions });
  } catch {
    return NextResponse.json({ sessions: [] });
  }
}
