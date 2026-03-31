import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { generateBridgeProposal } from "@/lib/ops-engine/bridge";
import { z } from "zod";

const bridgeRequestSchema = z.object({
  session_id: z.string().uuid(),
  workspace_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = bridgeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const proposal = await generateBridgeProposal(
      parsed.data.session_id,
      parsed.data.workspace_id
    );

    return NextResponse.json({ proposal });
  } catch (error) {
    console.error("Bridge proposal generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate bridge proposal" },
      { status: 500 }
    );
  }
}
