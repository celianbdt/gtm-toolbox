import { NextRequest, NextResponse } from "next/server";
import { createICASession, getICAAnalystTemplates } from "@/lib/icp-audit/db";
import { requireWorkspaceMember } from "@/lib/supabase/auth";
import type { ICASessionConfig, ICPSegment, ICPPersona, CustomerDataSource, WinLossEntry, AuditFocus } from "@/lib/icp-audit/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      workspaceId,
      icpDefinition,
      segments,
      personas,
      customerData,
      winLossData,
      focusDimensions,
      customQuestion,
      insightSessionIds,
    } = body as {
      workspaceId: string;
      icpDefinition: string;
      segments: ICPSegment[];
      personas: ICPPersona[];
      customerData: CustomerDataSource[];
      winLossData: WinLossEntry[];
      focusDimensions: AuditFocus[];
      customQuestion?: string;
      insightSessionIds?: string[];
    };

    if (!workspaceId || !icpDefinition?.trim() || !segments?.length || !focusDimensions?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const auth = await requireWorkspaceMember(workspaceId);
    if (auth.error) return auth.error;

    const analysts = await getICAAnalystTemplates();
    if (analysts.length === 0) {
      return NextResponse.json(
        { error: "ICA analyst templates not found. Run the migration." },
        { status: 500 }
      );
    }

    const config: ICASessionConfig = {
      icp_definition: icpDefinition,
      segments,
      personas,
      customer_data: customerData ?? [],
      win_loss_data: winLossData ?? [],
      focus_dimensions: focusDimensions,
      custom_question: customQuestion,
      analyst_agent_ids: analysts.map((a) => a.id),
      current_phase: "data-processing",
      phase_config: {
        debate_rounds: 1,
      },
      insight_session_ids: insightSessionIds,
    };

    const segmentNames = segments.map((s) => s.name).join(", ");
    const title = `ICP Audit: ${segmentNames}`.slice(0, 80);

    const session = await createICASession({
      workspace_id: workspaceId,
      config,
      title,
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Failed to create ICA session:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
