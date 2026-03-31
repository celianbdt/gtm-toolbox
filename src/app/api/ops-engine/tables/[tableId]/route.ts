import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { updateTableSchema } from "@/lib/ops-engine/schemas";
import { getTable, updateTable, deleteTable } from "@/lib/ops-engine/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { tableId } = await params;
    const table = await getTable(tableId);
    return NextResponse.json({ table });
  } catch (error) {
    console.error("Failed to get table:", error);
    return NextResponse.json(
      { error: "Table not found" },
      { status: 404 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { tableId } = await params;
    const body = await request.json();
    const parsed = updateTableSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const table = await updateTable(tableId, parsed.data);
    return NextResponse.json({ table });
  } catch (error) {
    console.error("Failed to update table:", error);
    return NextResponse.json(
      { error: "Failed to update table" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { tableId } = await params;
    await deleteTable(tableId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete table:", error);
    return NextResponse.json(
      { error: "Failed to delete table" },
      { status: 500 }
    );
  }
}
