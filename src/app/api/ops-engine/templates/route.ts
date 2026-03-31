import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { listTemplates } from "@/lib/ops-engine/db";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const workspaceId = request.nextUrl.searchParams.get("workspace_id") ?? undefined;
    const templates = await listTemplates(workspaceId);
    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Failed to list templates:", error);
    return NextResponse.json(
      { error: "Failed to list templates" },
      { status: 500 }
    );
  }
}
