import { NextRequest, NextResponse } from "next/server";
import { updateAgent, deleteAgent } from "@/lib/agents/db";
import { requireAuth } from "@/lib/supabase/auth";
import type { AgentConfig } from "@/lib/debate/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;
    const body = await request.json();
    const agent = await updateAgent(id, body as Partial<AgentConfig>);
    return NextResponse.json({ agent });
  } catch (error) {
    console.error("Failed to update agent:", error);
    return NextResponse.json({ error: "Failed to update agent" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;
    await deleteAgent(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete agent:", error);
    return NextResponse.json({ error: "Failed to delete agent" }, { status: 500 });
  }
}
