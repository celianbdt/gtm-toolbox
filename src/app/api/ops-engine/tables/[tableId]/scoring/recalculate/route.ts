import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { recalculateTable } from "@/lib/ops-engine/scoring";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { tableId } = await params;
    const result = await recalculateTable(tableId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to recalculate table:", error);
    return NextResponse.json(
      { error: "Failed to recalculate table scores" },
      { status: 500 }
    );
  }
}
