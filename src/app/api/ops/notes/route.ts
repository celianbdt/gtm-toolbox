import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { listOpsNotes, createOpsNote } from "@/lib/ops/db";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const sp = request.nextUrl.searchParams;
  const workspaceId = sp.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  try {
    const notes = await listOpsNotes(workspaceId, {
      search: sp.get("search") ?? undefined,
      tag: sp.get("tag") ?? undefined,
      source: sp.get("source") ?? undefined,
      pinned: sp.get("pinned") === "true" ? true : undefined,
    });
    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Failed to list ops notes:", error);
    return NextResponse.json({ error: "Failed to list notes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { workspace_id, title, content, source, source_session_id, tags } = body;

    if (!workspace_id || !title) {
      return NextResponse.json({ error: "workspace_id and title required" }, { status: 400 });
    }

    const note = await createOpsNote({
      workspace_id,
      title,
      content: content ?? "",
      source,
      source_session_id,
      tags,
    });
    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error("Failed to create ops note:", error);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}
