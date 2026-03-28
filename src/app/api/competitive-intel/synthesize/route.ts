import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  getCISession,
  getAgentsByIds,
  getSessionMessages,
  getWorkspaceContext,
  insertSessionOutput,
  updateSessionPhase,
} from "@/lib/competitive-intel/db";
import { buildSynthesisPrompt } from "@/lib/competitive-intel/prompts";
import {
  BattleCardSchema,
  PositioningMatrixSchema,
  ObjectionPlaybookSchema,
  ThreatAssessmentSchema,
} from "@/lib/competitive-intel/schemas";
import type { BattleCard, PositioningMatrix, ObjectionPlaybook, ThreatAssessment, ExecutiveSummary } from "@/lib/competitive-intel/schemas";
import { ExecutiveSummarySchema } from "@/lib/competitive-intel/schemas";
import { z } from "zod";

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json() as { sessionId: string };

    const session = await getCISession(sessionId);
    const config = session.config;
    const agents = await getAgentsByIds(config.analyst_agent_ids);
    const messages = await getSessionMessages(sessionId);
    const workspaceContext = await getWorkspaceContext(session.workspace_id);

    if (messages.length === 0) {
      return NextResponse.json({ error: "No messages to synthesize" }, { status: 400 });
    }

    // Build transcript from all agent messages
    const fullTranscript = messages
      .filter((m) => m.role === "agent")
      .map((m) => {
        const agent = agents.find((a) => a.id === m.agent_config_id);
        return `[${agent?.name ?? "Analyst"}]: ${m.content}`;
      })
      .join("\n\n---\n\n");

    const competitorNames = config.competitors.map((c) => c.name);
    const results: string[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function synth<T>(label: string, promptType: any, schema: any, onResult: (obj: T) => Promise<void>) {
      try {
        const prompt = buildSynthesisPrompt(promptType, fullTranscript, competitorNames, workspaceContext);
        const { object } = await generateObject({ model: anthropic("claude-sonnet-4-5"), schema, prompt });
        await onResult(object as T);
        results.push(label);
      } catch (e) {
        console.error(`Synthesis failed for ${label}:`, e);
      }
    }

    await synth<{ cards: BattleCard[] }>("battle-cards", "battle-cards", z.object({ cards: z.array(BattleCardSchema) }), async (r) => {
      for (const card of r.cards) {
        await insertSessionOutput({ session_id: sessionId, output_type: "battle-card", title: `Battle Card: ${card.competitor_name}`, description: card.one_liner, metadata: card as unknown as Record<string, unknown> });
      }
    });

    await synth<PositioningMatrix>("positioning-matrix", "positioning-matrix", PositioningMatrixSchema, async (m) => {
      await insertSessionOutput({ session_id: sessionId, output_type: "positioning-matrix", title: "Positioning Matrix", description: m.insight.slice(0, 200), metadata: m as unknown as Record<string, unknown> });
    });

    await synth<{ playbooks: ObjectionPlaybook[] }>("objection-playbook", "objection-playbook", z.object({ playbooks: z.array(ObjectionPlaybookSchema) }), async (r) => {
      for (const pb of r.playbooks) {
        await insertSessionOutput({ session_id: sessionId, output_type: "objection-playbook", title: `Objections: ${pb.competitor_name}`, description: `${pb.objections.length} objections`, metadata: pb as unknown as Record<string, unknown> });
      }
    });

    await synth<ThreatAssessment>("threat-assessment", "threat-assessment", ThreatAssessmentSchema, async (t) => {
      await insertSessionOutput({ session_id: sessionId, output_type: "threat-assessment", title: "Threat & Opportunity Assessment", description: t.overall_competitive_position.slice(0, 200), metadata: t as unknown as Record<string, unknown> });
    });

    // Executive Summary
    await synth<ExecutiveSummary>("executive-summary", "executive-summary", ExecutiveSummarySchema, async (s) => {
      await insertSessionOutput({ session_id: sessionId, output_type: "executive-summary" as any, title: s.title, description: s.competitive_landscape.slice(0, 200), metadata: s as unknown as Record<string, unknown> });
    });

    await updateSessionPhase(sessionId, "complete");

    return NextResponse.json({ success: true, generated: results });
  } catch (error) {
    console.error("Synthesize error:", error);
    return NextResponse.json({ error: "Synthesis failed" }, { status: 500 });
  }
}
