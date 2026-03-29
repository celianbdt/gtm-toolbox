import { NextRequest, NextResponse } from "next/server";
import { generateObject, generateText } from "ai";
import { requireAuth } from "@/lib/supabase/auth";
import { anthropic } from "@ai-sdk/anthropic";
import {
  getMLSession,
  getAgentsByIds,
  getSessionMessages,
  getWorkspaceContext,
  insertSessionOutput,
  updateSessionPhase,
} from "@/lib/messaging-lab/db";
import { buildSynthesisPrompt } from "@/lib/messaging-lab/prompts";
import {
  MessagingFrameworkSchema,
  ValuePropositionsSchema,
  TaglineOptionsSchema,
  ObjectionResponsesSchema,
  ElevatorPitchSchema,
  MLExecutiveSummarySchema,
} from "@/lib/messaging-lab/schemas";
import type {
  MessagingFramework,
  ValuePropositions,
  TaglineOptions,
  ObjectionResponses,
  ElevatorPitch,
  MLExecutiveSummary,
} from "@/lib/messaging-lab/schemas";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { sessionId } = (await request.json()) as { sessionId: string };

    const session = await getMLSession(sessionId);
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
        return `[${agent?.name ?? "Agent"}]: ${m.content}`;
      })
      .join("\n\n---\n\n");

    const results: string[] = [];

    // Compress transcript with Haiku before synthesis
    const compressedTranscript = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      maxOutputTokens: 2000,
      prompt: `Summarize this multi-agent analysis transcript into key findings, decisions, disagreements, and recommendations. Be comprehensive but concise (max 1500 words).

TRANSCRIPT:
${fullTranscript}`,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function synth<T>(label: string, promptType: any, schema: any, onResult: (obj: T) => Promise<void>) {
      try {
        const prompt = buildSynthesisPrompt(promptType, compressedTranscript.text, config, workspaceContext);
        const { object } = await generateObject({ model: anthropic("claude-sonnet-4-5"), schema, prompt });
        await onResult(object as T);
        results.push(label);
      } catch (e) {
        console.error(`Synthesis failed for ${label}:`, e);
      }
    }

    await synth<MessagingFramework>("messaging-framework", "messaging-framework", MessagingFrameworkSchema, async (f) => {
      await insertSessionOutput({ session_id: sessionId, output_type: "messaging-framework", title: "Messaging Framework", description: f.positioning_statement.slice(0, 200), metadata: f as unknown as Record<string, unknown> });
    });

    await synth<ValuePropositions>("value-propositions", "value-propositions", ValuePropositionsSchema, async (r) => {
      await insertSessionOutput({ session_id: sessionId, output_type: "value-propositions", title: "Value Propositions", description: `${r.propositions.length} value propositions`, metadata: r as unknown as Record<string, unknown> });
    });

    await synth<TaglineOptions>("tagline-options", "tagline-options", TaglineOptionsSchema, async (r) => {
      await insertSessionOutput({ session_id: sessionId, output_type: "tagline-options", title: "Tagline Options", description: r.recommendation.slice(0, 200), metadata: r as unknown as Record<string, unknown> });
    });

    await synth<ObjectionResponses>("objection-responses", "objection-responses", ObjectionResponsesSchema, async (r) => {
      await insertSessionOutput({ session_id: sessionId, output_type: "objection-responses", title: "Objection Responses", description: `${r.objections.length} objections`, metadata: r as unknown as Record<string, unknown> });
    });

    await synth<ElevatorPitch>("elevator-pitch", "elevator-pitch", ElevatorPitchSchema, async (r) => {
      await insertSessionOutput({ session_id: sessionId, output_type: "elevator-pitch", title: "Elevator Pitch", description: r.key_hook.slice(0, 200), metadata: r as unknown as Record<string, unknown> });
    });

    await synth<MLExecutiveSummary>("executive-summary", "executive-summary", MLExecutiveSummarySchema, async (s) => {
      await insertSessionOutput({ session_id: sessionId, output_type: "executive-summary", title: s.title, description: s.messaging_assessment.slice(0, 200), metadata: s as unknown as Record<string, unknown> });
    });

    await updateSessionPhase(sessionId, "complete");

    return NextResponse.json({ success: true, generated: results });
  } catch (error) {
    console.error("ML Synthesize error:", error);
    return NextResponse.json({ error: "Synthesis failed" }, { status: 500 });
  }
}
