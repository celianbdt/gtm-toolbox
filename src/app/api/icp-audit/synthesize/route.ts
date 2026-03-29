import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  getICASession,
  getAgentsByIds,
  getSessionMessages,
  getWorkspaceContext,
  insertSessionOutput,
  updateSessionPhase,
} from "@/lib/icp-audit/db";
import { buildSynthesisPrompt } from "@/lib/icp-audit/prompts";
import {
  ICPScorecardSchema,
  SegmentAnalysisSchema,
  PersonaCardSchema,
  TAMSAMAnalysisSchema,
  PrioritizationMatrixSchema,
  ICAExecutiveSummarySchema,
} from "@/lib/icp-audit/schemas";
import type {
  ICPScorecard,
  SegmentAnalysis,
  PersonaCard,
  TAMSAMAnalysis,
  PrioritizationMatrix,
  ICAExecutiveSummary,
} from "@/lib/icp-audit/schemas";
import { z } from "zod";

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = (await request.json()) as { sessionId: string };

    const session = await getICASession(sessionId);
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
        const prompt = buildSynthesisPrompt(
          promptType,
          fullTranscript,
          config.icp_definition,
          config.segments,
          config.personas,
          workspaceContext
        );
        const { object } = await generateObject({ model: anthropic("claude-sonnet-4-5"), schema, prompt });
        await onResult(object as T);
        results.push(label);
      } catch (e) {
        console.error(`Synthesis failed for ${label}:`, e);
      }
    }

    await synth<ICPScorecard>("icp-scorecard", "icp-scorecard", ICPScorecardSchema, async (s) => {
      await insertSessionOutput({
        session_id: sessionId,
        output_type: "icp-scorecard",
        title: "ICP Scorecard",
        description: s.overall_assessment.slice(0, 200),
        confidence_score: s.overall_score,
        metadata: s as unknown as Record<string, unknown>,
      });
    });

    await synth<{ segments: SegmentAnalysis[] }>("segment-analysis", "segment-analysis", z.object({ segments: z.array(SegmentAnalysisSchema) }), async (r) => {
      for (const seg of r.segments) {
        await insertSessionOutput({
          session_id: sessionId,
          output_type: "segment-analysis",
          title: `Segment: ${seg.segment_name}`,
          description: `${seg.recommendation} (fit: ${seg.fit_score}/100)`,
          confidence_score: seg.fit_score,
          metadata: seg as unknown as Record<string, unknown>,
        });
      }
    });

    await synth<{ personas: PersonaCard[] }>("persona-cards", "persona-cards", z.object({ personas: z.array(PersonaCardSchema) }), async (r) => {
      for (const p of r.personas) {
        await insertSessionOutput({
          session_id: sessionId,
          output_type: "persona-card",
          title: `Persona: ${p.persona_title}`,
          description: p.messaging_angle.slice(0, 200),
          confidence_score: p.confidence,
          metadata: p as unknown as Record<string, unknown>,
        });
      }
    });

    await synth<TAMSAMAnalysis>("tam-sam-analysis", "tam-sam-analysis", TAMSAMAnalysisSchema, async (t) => {
      await insertSessionOutput({
        session_id: sessionId,
        output_type: "tam-sam-analysis",
        title: "TAM / SAM / SOM Analysis",
        description: `TAM: ${t.tam_estimate} | SAM: ${t.sam_estimate} | SOM: ${t.som_estimate}`,
        metadata: t as unknown as Record<string, unknown>,
      });
    });

    await synth<PrioritizationMatrix>("prioritization-matrix", "prioritization-matrix", PrioritizationMatrixSchema, async (m) => {
      await insertSessionOutput({
        session_id: sessionId,
        output_type: "prioritization-matrix",
        title: "Segment Prioritization Matrix",
        description: m.recommendation.slice(0, 200),
        metadata: m as unknown as Record<string, unknown>,
      });
    });

    await synth<ICAExecutiveSummary>("executive-summary", "executive-summary", ICAExecutiveSummarySchema, async (s) => {
      await insertSessionOutput({
        session_id: sessionId,
        output_type: "executive-summary",
        title: s.title,
        description: `ICP Health: ${s.icp_health}`,
        metadata: s as unknown as Record<string, unknown>,
      });
    });

    await updateSessionPhase(sessionId, "complete");

    return NextResponse.json({ success: true, generated: results });
  } catch (error) {
    console.error("ICA synthesize error:", error);
    return NextResponse.json({ error: "Synthesis failed" }, { status: 500 });
  }
}
