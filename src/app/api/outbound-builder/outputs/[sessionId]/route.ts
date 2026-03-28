import { NextRequest, NextResponse } from "next/server";
import { getSessionOutputs } from "@/lib/outbound-builder/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  try {
    const outputs = await getSessionOutputs(sessionId);
    return NextResponse.json({ outputs });
  } catch (e) {
    console.error("[outbound-builder/outputs]", e);
    return NextResponse.json({ error: "Failed to load outputs" }, { status: 500 });
  }
}
