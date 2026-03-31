import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { updateRowSchema } from "@/lib/ops-engine/schemas";
import { getRow, updateRow, deleteRow } from "@/lib/ops-engine/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tableId: string; rowId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { rowId } = await params;
    const row = await getRow(rowId);
    return NextResponse.json({ row });
  } catch (error) {
    console.error("Failed to get row:", error);
    return NextResponse.json(
      { error: "Row not found" },
      { status: 404 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string; rowId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { rowId } = await params;
    const body = await request.json();
    const parsed = updateRowSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const row = await updateRow(rowId, parsed.data);
    return NextResponse.json({ row });
  } catch (error) {
    console.error("Failed to update row:", error);
    return NextResponse.json(
      { error: "Failed to update row" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tableId: string; rowId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { rowId } = await params;
    await deleteRow(rowId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete row:", error);
    return NextResponse.json(
      { error: "Failed to delete row" },
      { status: 500 }
    );
  }
}
