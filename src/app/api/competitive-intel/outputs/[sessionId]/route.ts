import { NextRequest, NextResponse } from "next/server";
import { getSessionOutputs } from "@/lib/competitive-intel/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const outputs = await getSessionOutputs(sessionId);
    return NextResponse.json({ outputs });
  } catch (error) {
    console.error("Failed to fetch CI outputs:", error);
    return NextResponse.json({ error: "Failed to fetch outputs" }, { status: 500 });
  }
}
