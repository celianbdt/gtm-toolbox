import { NextRequest, NextResponse } from "next/server";
import { getSessionMessages } from "@/lib/debate/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const messages = await getSessionMessages(sessionId);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Failed to get messages:", error);
    return NextResponse.json({ error: "Failed to get messages" }, { status: 500 });
  }
}
