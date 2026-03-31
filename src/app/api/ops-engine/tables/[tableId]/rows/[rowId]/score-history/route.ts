import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { getScoreHistory } from "@/lib/ops-engine/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tableId: string; rowId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { rowId } = await params;
    const history = await getScoreHistory(rowId);

    return NextResponse.json({ history });
  } catch (error) {
    console.error("Failed to get score history:", error);
    return NextResponse.json(
      { error: "Failed to get score history" },
      { status: 500 }
    );
  }
}
