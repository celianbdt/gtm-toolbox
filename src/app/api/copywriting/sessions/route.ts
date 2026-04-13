import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { createSessionSchema } from "@/lib/copywriting/schemas";
import { createCWSession, listCWSessions } from "@/lib/copywriting/db";
import { CHANNEL_LABELS } from "@/lib/copywriting/types";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = createSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { workspace_id, channel, tone, mode, sequence_length, brief, title } = parsed.data;

    const session = await createCWSession({
      workspace_id,
      config: {
        channel,
        tone,
        mode,
        sequence_length,
        brief,
        current_phase: "context-loading",
      },
      title: title || `${CHANNEL_LABELS[channel]} — ${sequence_length} steps`,
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error("Failed to create copywriting session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
  }

  try {
    const sessions = await listCWSessions(workspaceId);
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Failed to list sessions:", error);
    return NextResponse.json({ error: "Failed to list sessions" }, { status: 500 });
  }
}
