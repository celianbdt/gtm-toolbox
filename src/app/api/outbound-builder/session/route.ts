import { NextRequest, NextResponse } from "next/server";
import { createOBSession, getOBAnalystTemplates } from "@/lib/outbound-builder/db";
import { requireWorkspaceMember } from "@/lib/supabase/auth";
import type { AnalyzerSessionConfig, BuilderSessionConfig, ImportSessionConfig, AnalyzerFocus, CampaignDataSource, ICPDefinition, ChannelConfig, SequenceParams } from "@/lib/outbound-builder/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, mode } = body as { workspaceId: string; mode: "analyzer" | "builder" | "import" };

    if (!workspaceId || !mode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const auth = await requireWorkspaceMember(workspaceId);
    if (auth.error) return auth.error;

    // Import mode doesn't need agent templates
    if (mode === "import") {
      const { campaignData, title: importTitle } = body as {
        campaignData: CampaignDataSource[];
        title?: string;
      };

      if (!campaignData?.length) {
        return NextResponse.json({ error: "No campaign data to save" }, { status: 400 });
      }

      const totalCampaigns = campaignData.reduce((sum, ds) => sum + ds.rows.length, 0);
      const config: ImportSessionConfig = {
        mode: "import",
        campaign_data: campaignData,
        total_campaigns: totalCampaigns,
      };

      const session = await createOBSession({
        workspace_id: workspaceId,
        config,
        title: (importTitle ?? `Import: ${totalCampaigns} campaigns`).slice(0, 80),
      });

      // Immediately conclude — import is just storage
      const supabase = (await import("@/lib/supabase/admin")).createAdminClient();
      await supabase
        .from("tool_sessions")
        .update({ status: "concluded" })
        .eq("id", session.id);

      return NextResponse.json({ session: { ...session, status: "concluded" } });
    }

    const analysts = await getOBAnalystTemplates();
    if (analysts.length === 0) {
      return NextResponse.json(
        { error: "Outbound agent templates not found. Run the migration." },
        { status: 500 }
      );
    }

    const analystIds = analysts.map((a) => a.id);

    if (mode === "analyzer") {
      const { campaignData, focusDimensions, customQuestion, insightSessionIds } = body as {
        campaignData: CampaignDataSource[];
        focusDimensions: AnalyzerFocus[];
        customQuestion?: string;
        insightSessionIds?: string[];
      };

      if (!campaignData?.length || !focusDimensions?.length) {
        return NextResponse.json({ error: "Missing campaign data or focus dimensions" }, { status: 400 });
      }

      const config: AnalyzerSessionConfig = {
        mode: "analyzer",
        campaign_data: campaignData,
        focus_dimensions: focusDimensions,
        custom_question: customQuestion,
        analyst_agent_ids: analystIds,
        current_phase: "data-processing",
        phase_config: { debate_rounds: 1 },
        insight_session_ids: insightSessionIds,
      };

      const totalCampaigns = campaignData.reduce((sum, ds) => sum + ds.rows.length, 0);
      const title = `Campaign Analysis: ${totalCampaigns} campaigns`;

      const session = await createOBSession({
        workspace_id: workspaceId,
        config,
        title: title.slice(0, 80),
      });

      return NextResponse.json({ session });
    }

    // Mode: builder
    const { icp, channels, sequenceParams, playbookSessionId, insightSessionIds } = body as {
      icp: ICPDefinition;
      channels: ChannelConfig;
      sequenceParams: SequenceParams;
      playbookSessionId?: string;
      insightSessionIds?: string[];
    };

    if (!icp?.persona_role || !channels) {
      return NextResponse.json({ error: "Missing ICP or channel configuration" }, { status: 400 });
    }

    const config: BuilderSessionConfig = {
      mode: "builder",
      icp,
      channels,
      sequence_params: sequenceParams,
      playbook_session_id: playbookSessionId,
      analyst_agent_ids: analystIds,
      current_phase: "context-loading",
      insight_session_ids: insightSessionIds,
    };

    const enabledChannels = Object.entries(channels)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join("+");
    const title = `Sequence: ${icp.persona_role} (${enabledChannels})`;

    const session = await createOBSession({
      workspace_id: workspaceId,
      config,
      title: title.slice(0, 80),
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Failed to create OB session:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
