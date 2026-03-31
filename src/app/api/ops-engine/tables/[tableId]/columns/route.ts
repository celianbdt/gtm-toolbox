import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { createColumnSchema } from "@/lib/ops-engine/schemas";
import { createColumn, getColumns } from "@/lib/ops-engine/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { tableId } = await params;
    const columns = await getColumns(tableId);
    return NextResponse.json({ columns });
  } catch (error) {
    console.error("Failed to get columns:", error);
    return NextResponse.json(
      { error: "Failed to get columns" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { tableId } = await params;
    const body = await request.json();
    const parsed = createColumnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const column = await createColumn(tableId, parsed.data);
    return NextResponse.json({ column }, { status: 201 });
  } catch (error) {
    console.error("Failed to create column:", error);
    return NextResponse.json(
      { error: "Failed to create column" },
      { status: 500 }
    );
  }
}
