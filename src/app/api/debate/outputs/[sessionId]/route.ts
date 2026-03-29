import { NextRequest, NextResponse } from "next/server";
import { getDebateOutputs } from "@/lib/debate/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const outputs = await getDebateOutputs(sessionId);
    return NextResponse.json({ outputs });
  } catch (error) {
    console.error("Failed to fetch debate outputs:", error);
    return NextResponse.json({ error: "Failed to fetch outputs" }, { status: 500 });
  }
}
