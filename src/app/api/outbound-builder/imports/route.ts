import { NextRequest, NextResponse } from "next/server";
import { listImportSessions } from "@/lib/outbound-builder/db";
import { requireWorkspaceMember } from "@/lib/supabase/auth";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }

  const auth = await requireWorkspaceMember(workspaceId);
  if (auth.error) return auth.error;

  try {
    const imports = await listImportSessions(workspaceId);
    return NextResponse.json({ imports });
  } catch (e) {
    console.error("[outbound-builder/imports]", e);
    return NextResponse.json({ error: "Failed to list imports" }, { status: 500 });
  }
}
