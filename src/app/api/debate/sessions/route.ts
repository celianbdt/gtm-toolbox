import { NextRequest, NextResponse } from "next/server";
import { listDebateSessions } from "@/lib/debate/db";
import { requireWorkspaceMember } from "@/lib/supabase/auth";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) {
    return NextResponse.json({ sessions: [] });
  }

  const auth = await requireWorkspaceMember(workspaceId);
  if (auth.error) return auth.error;

  try {
    const sessions = await listDebateSessions(workspaceId);
    return NextResponse.json({ sessions });
  } catch {
    return NextResponse.json({ sessions: [] });
  }
}
