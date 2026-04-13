import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { checkAllPrerequisites } from "@/lib/tools/prerequisites";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  try {
    const prerequisites = await checkAllPrerequisites(workspaceId);
    return NextResponse.json({ prerequisites });
  } catch (error) {
    console.error("Failed to check prerequisites:", error);
    return NextResponse.json({ error: "Failed to check prerequisites" }, { status: 500 });
  }
}
