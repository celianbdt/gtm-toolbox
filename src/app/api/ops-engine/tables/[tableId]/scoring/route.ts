import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { scoringConfigSchema } from "@/lib/ops-engine/schemas";
import { getTable, updateTable } from "@/lib/ops-engine/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { tableId } = await params;
    const table = await getTable(tableId);
    return NextResponse.json({ scoring_config: table.scoring_config });
  } catch (error) {
    console.error("Failed to get scoring config:", error);
    return NextResponse.json(
      { error: "Table not found" },
      { status: 404 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { tableId } = await params;
    const body = await request.json();
    const parsed = scoringConfigSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const table = await updateTable(tableId, {
      scoring_config: parsed.data,
    });

    return NextResponse.json({ scoring_config: table.scoring_config });
  } catch (error) {
    console.error("Failed to update scoring config:", error);
    return NextResponse.json(
      { error: "Failed to update scoring config" },
      { status: 500 }
    );
  }
}
