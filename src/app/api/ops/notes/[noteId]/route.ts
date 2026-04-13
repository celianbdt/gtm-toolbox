import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { updateOpsNote, deleteOpsNote } from "@/lib/ops/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { noteId } = await params;
    const body = await request.json();
    const note = await updateOpsNote(noteId, body);
    return NextResponse.json({ note });
  } catch (error) {
    console.error("Failed to update ops note:", error);
    return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { noteId } = await params;
    await deleteOpsNote(noteId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete ops note:", error);
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
