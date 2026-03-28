import { NextRequest, NextResponse } from "next/server";
import { getAvailableInsightSessions } from "@/lib/insights";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }

  const excludeToolId = req.nextUrl.searchParams.get("excludeToolId") ?? undefined;

  try {
    const sessions = await getAvailableInsightSessions(workspaceId, excludeToolId);
    return NextResponse.json({ sessions });
  } catch (e) {
    console.error("[insights/available]", e);
    return NextResponse.json({ error: "Failed to load insight sessions" }, { status: 500 });
  }
}
