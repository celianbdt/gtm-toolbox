import { NextRequest, NextResponse } from "next/server";
import { listOBSessions } from "@/lib/outbound-builder/db";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }

  try {
    const sessions = await listOBSessions(workspaceId);
    return NextResponse.json({ sessions });
  } catch (e) {
    console.error("[outbound-builder/sessions]", e);
    return NextResponse.json({ error: "Failed to list sessions" }, { status: 500 });
  }
}
