import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  getCPSession,
  getAgentsByIds,
  getSessionMessages,
  getWorkspaceContext,
  insertSessionOutput,
  updateSessionPhase,
} from "@/lib/channel-planner/db";
import { buildSynthesisPrompt } from "@/lib/channel-planner/prompts";
import {
  ChannelScorecardSchema,
  BudgetAllocationOutputSchema,
  ChannelPlaybookSchema,
  TimelineRoadmapSchema,
  ROIProjectionsSchema,
  CPExecutiveSummarySchema,
} from "@/lib/channel-planner/schemas";
import type {
  ChannelScorecard,
  BudgetAllocationOutput,
  ChannelPlaybook,
  TimelineRoadmap,
  ROIProjections,
  CPExecutiveSummary,
} from "@/lib/channel-planner/schemas";
import { z } from "zod";

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = (await request.json()) as { sessionId: string };

    const session = await getCPSession(sessionId);
    const config = session.config;
    const agents = await getAgentsByIds(config.analyst_agent_ids);
    const messages = await getSessionMessages(sessionId);
    const workspaceContext = await getWorkspaceContext(session.workspace_id);

    if (messages.length === 0) {
      return NextResponse.json({ error: "No messages to synthesize" }, { status: 400 });
    }

    const fullTranscript = messages
      .filter((m) => m.role === "agent")
      .map((m) => {
        const agent = agents.find((a) => a.id === m.agent_config_id);
        return `[${agent?.name ?? "Analyst"}]: ${m.content}`;
      })
      .join("\n\n---\n\n");

    const results: string[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function synth<T>(label: string, promptType: any, schema: any, onResult: (obj: T) => Promise<void>) {
      try {
        const prompt = buildSynthesisPrompt(promptType, fullTranscript, config, workspaceContext);
        const { object } = await generateObject({ model: anthropic("claude-sonnet-4-5"), schema, prompt });
        await onResult(object as T);
        results.push(label);
      } catch (e) {
        console.error(`Synthesis failed for ${label}:`, e);
      }
    }

    await synth<ChannelScorecard>("channel-scorecard", "channel-scorecard", ChannelScorecardSchema, async (s) => {
      await insertSessionOutput({ session_id: sessionId, output_type: "channel-scorecard", title: "Channel Scorecard", description: s.overall_assessment.slice(0, 200), metadata: s as unknown as Record<string, unknown> });
    });

    await synth<BudgetAllocationOutput>("budget-allocation", "budget-allocation", BudgetAllocationOutputSchema, async (a) => {
      await insertSessionOutput({ session_id: sessionId, output_type: "budget-allocation", title: "Budget Allocation Plan", description: a.reallocation_summary.slice(0, 200), metadata: a as unknown as Record<string, unknown> });
    });

    await synth<{ playbooks: ChannelPlaybook[] }>("channel-playbooks", "channel-playbooks", z.object({ playbooks: z.array(ChannelPlaybookSchema) }), async (r) => {
      for (const pb of r.playbooks) {
        await insertSessionOutput({ session_id: sessionId, output_type: "channel-playbook", title: `Playbook: ${pb.channel_name}`, description: pb.objective, metadata: pb as unknown as Record<string, unknown> });
      }
    });

    await synth<TimelineRoadmap>("timeline-roadmap", "timeline-roadmap", TimelineRoadmapSchema, async (t) => {
      await insertSessionOutput({ session_id: sessionId, output_type: "timeline-roadmap", title: "Timeline Roadmap", description: t.critical_path.slice(0, 200), metadata: t as unknown as Record<string, unknown> });
    });

    await synth<ROIProjections>("roi-projections", "roi-projections", ROIProjectionsSchema, async (r) => {
      await insertSessionOutput({ session_id: sessionId, output_type: "roi-projections", title: "ROI Projections", description: `Blended CAC: $${r.blended_cac} | Pipeline: $${r.total_expected_pipeline}`, metadata: r as unknown as Record<string, unknown> });
    });

    await synth<CPExecutiveSummary>("executive-summary", "executive-summary", CPExecutiveSummarySchema, async (s) => {
      await insertSessionOutput({ session_id: sessionId, output_type: "executive-summary", title: s.title, description: s.channel_landscape.slice(0, 200), metadata: s as unknown as Record<string, unknown> });
    });

    await updateSessionPhase(sessionId, "complete");

    return NextResponse.json({ success: true, generated: results });
  } catch (error) {
    console.error("Synthesize error:", error);
    return NextResponse.json({ error: "Synthesis failed" }, { status: 500 });
  }
}
