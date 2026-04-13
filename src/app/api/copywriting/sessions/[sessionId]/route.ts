import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { getCWSession, getSessionOutputs } from "@/lib/copywriting/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { sessionId } = await params;
    const [session, outputs] = await Promise.all([
      getCWSession(sessionId),
      getSessionOutputs(sessionId),
    ]);
    return NextResponse.json({ session, outputs });
  } catch (error) {
    console.error("Failed to get session:", error);
    return NextResponse.json({ error: "Failed to get session" }, { status: 500 });
  }
}
