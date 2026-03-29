import { NextRequest, NextResponse } from "next/server";
import { getSessionOutputs } from "@/lib/messaging-lab/db";
import { requireAuth } from "@/lib/supabase/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { sessionId } = await params;
    const outputs = await getSessionOutputs(sessionId);
    return NextResponse.json({ outputs });
  } catch (error) {
    console.error("Failed to fetch ML outputs:", error);
    return NextResponse.json({ error: "Failed to fetch outputs" }, { status: 500 });
  }
}
