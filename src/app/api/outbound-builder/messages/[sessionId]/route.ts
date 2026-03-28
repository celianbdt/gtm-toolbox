import { NextRequest, NextResponse } from "next/server";
import { getSessionMessages } from "@/lib/outbound-builder/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  try {
    const messages = await getSessionMessages(sessionId);
    return NextResponse.json({ messages });
  } catch (e) {
    console.error("[outbound-builder/messages]", e);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}
