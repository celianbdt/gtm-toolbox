import { NextRequest, NextResponse } from "next/server";
import { getCompetitorDocs } from "@/lib/competitive-intel/db";
import { requireWorkspaceMember } from "@/lib/supabase/auth";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) {
    return NextResponse.json({ docs: [] });
  }

  const auth = await requireWorkspaceMember(workspaceId);
  if (auth.error) return auth.error;

  try {
    const docs = await getCompetitorDocs(workspaceId);
    return NextResponse.json({ docs });
  } catch {
    return NextResponse.json({ docs: [] });
  }
}
