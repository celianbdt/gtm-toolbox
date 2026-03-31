import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { updateColumnSchema } from "@/lib/ops-engine/schemas";
import { updateColumn, deleteColumn } from "@/lib/ops-engine/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string; columnId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { columnId } = await params;
    const body = await request.json();
    const parsed = updateColumnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const column = await updateColumn(columnId, parsed.data);
    return NextResponse.json({ column });
  } catch (error) {
    console.error("Failed to update column:", error);
    return NextResponse.json(
      { error: "Failed to update column" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tableId: string; columnId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { columnId } = await params;
    await deleteColumn(columnId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete column:", error);
    return NextResponse.json(
      { error: "Failed to delete column" },
      { status: 500 }
    );
  }
}
