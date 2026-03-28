import { NextRequest, NextResponse } from "next/server";
import { createCISession, getCIAnalystTemplates } from "@/lib/competitive-intel/db";
import type { CISessionConfig, CompetitorEntry, AnalysisFocus } from "@/lib/competitive-intel/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, competitors, focusDimensions, customQuestion } = body as {
      workspaceId: string;
      competitors: CompetitorEntry[];
      focusDimensions: AnalysisFocus[];
      customQuestion?: string;
    };

    if (!workspaceId || !competitors?.length || !focusDimensions?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const analysts = await getCIAnalystTemplates();
    if (analysts.length === 0) {
      return NextResponse.json(
        { error: "CI analyst templates not found. Run the migration." },
        { status: 500 }
      );
    }

    const config: CISessionConfig = {
      competitors,
      focus_dimensions: focusDimensions,
      custom_question: customQuestion,
      analyst_agent_ids: analysts.map((a) => a.id),
      current_phase: "data-processing",
      phase_config: {
        debate_rounds: 1,
      },
    };

    const title = competitors.length === 1
      ? `Competitive Intel: ${competitors[0].name}`
      : `Competitive Intel: ${competitors.map((c) => c.name).join(" vs ")}`;

    const session = await createCISession({
      workspace_id: workspaceId,
      config,
      title: title.slice(0, 80),
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Failed to create CI session:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
