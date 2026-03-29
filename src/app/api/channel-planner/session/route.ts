import { NextRequest, NextResponse } from "next/server";
import { createCPSession, getCPAnalystTemplates } from "@/lib/channel-planner/db";
import { requireWorkspaceMember } from "@/lib/supabase/auth";
import type {
  CPSessionConfig,
  GoalsInfo,
  BudgetInfo,
  CurrentChannelPerformance,
  ICPContext,
  ChannelFocus,
} from "@/lib/channel-planner/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      workspaceId,
      goals,
      budget,
      currentChannels,
      icpContext,
      focusDimensions,
      customQuestion,
      insightSessionIds,
    } = body as {
      workspaceId: string;
      goals: GoalsInfo;
      budget: BudgetInfo;
      currentChannels: CurrentChannelPerformance[];
      icpContext: ICPContext;
      focusDimensions: ChannelFocus[];
      customQuestion?: string;
      insightSessionIds?: string[];
    };

    if (!workspaceId || !goals || !budget || !focusDimensions?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const auth = await requireWorkspaceMember(workspaceId);
    if (auth.error) return auth.error;

    const analysts = await getCPAnalystTemplates();
    if (analysts.length === 0) {
      return NextResponse.json(
        { error: "Channel Planner analyst templates not found. Run the migration." },
        { status: 500 }
      );
    }

    const config: CPSessionConfig = {
      goals,
      budget,
      current_channels: currentChannels ?? [],
      icp_context: icpContext,
      focus_dimensions: focusDimensions,
      custom_question: customQuestion,
      analyst_agent_ids: analysts.map((a) => a.id),
      current_phase: "context-loading",
      phase_config: {
        debate_rounds: 1,
      },
      insight_session_ids: insightSessionIds,
    };

    const title = `Channel Plan: ${goals.primary_objective.slice(0, 40)}${
      goals.primary_objective.length > 40 ? "..." : ""
    }`;

    const session = await createCPSession({
      workspace_id: workspaceId,
      config,
      title: title.slice(0, 80),
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Failed to create CP session:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
