import { NextRequest, NextResponse } from "next/server";
import { streamText, generateObject, generateText } from "ai";
import { requireAuth } from "@/lib/supabase/auth";
import { anthropic } from "@ai-sdk/anthropic";
import {
  getMLSession,
  getAgentsByIds,
  getWorkspaceContext,
  insertMessage,
  insertSessionOutput,
  updateSessionPhase,
} from "@/lib/messaging-lab/db";
import { getToolKnowledge } from "@/lib/knowledge";
import { getToolInsights } from "@/lib/insights";
import {
  buildContextExtractionPrompt,
  buildWorkshopPrompt,
  buildCritiqueRound1Prompt,
  buildCritiqueRound2Prompt,
  buildSynthesisPrompt,
} from "@/lib/messaging-lab/prompts";
import {
  MessagingContextSchema,
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
import type { MLSSEEvent } from "@/lib/messaging-lab/types";

function encodeSSE(event: MLSSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { sessionId } = body as { sessionId: string };

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: MLSSEEvent) => {
        controller.enqueue(new TextEncoder().encode(encodeSSE(event)));
      };

      try {
        const session = await getMLSession(sessionId);
        const config = session.config;
        const agents = await getAgentsByIds(config.analyst_agent_ids);
        const workspaceContext = await getWorkspaceContext(session.workspace_id);
        const toolInsights = await getToolInsights(config.insight_session_ids ?? []);
        const knowledgeBase = await getToolKnowledge("messaging-lab");

        // ══════════════════════════════════════════
        // PHASE 1: Context Loading
        // ══════════════════════════════════════════
        send({ type: "phase_start", phase: "context-loading", phaseNumber: 1 });
        await updateSessionPhase(sessionId, "context-loading");

        const contextPrompt = buildContextExtractionPrompt(config, workspaceContext, toolInsights);

        const { object: messagingContext } = await generateObject({
          model: anthropic("claude-haiku-4-5"),
          schema: MessagingContextSchema,
          prompt: contextPrompt,
        });

        await insertSessionOutput({
          session_id: sessionId,
          output_type: "executive-summary",
          title: "Messaging Context",
          description: messagingContext.current_messaging_assessment,
          metadata: messagingContext as unknown as Record<string, unknown>,
          tags: ["context"],
        });

        send({ type: "phase_done", phase: "context-loading" });

        // ══════════════════════════════════════════
        // PHASE 2: Messaging Workshop
        // ══════════════════════════════════════════
        send({ type: "phase_start", phase: "messaging-workshop", phaseNumber: 2 });
        await updateSessionPhase(sessionId, "messaging-workshop");

        const workshopPrompt = buildWorkshopPrompt(
          messagingContext,
          config,
          config.focus_dimensions,
          config.custom_question,
          workspaceContext,
          knowledgeBase,
          toolInsights
        );

        const workshopMessages: { agentId: string; content: string }[] = [];

        for (let i = 0; i < agents.length; i++) {
          const agent = agents[i];

          send({
            type: "agent_start",
            agentId: agent.id,
            agentName: agent.name,
            emoji: agent.avatar_emoji,
            color: agent.color,
            phase: "messaging-workshop",
          });

          let fullContent = "";

          const result = streamText({
            model: anthropic("claude-sonnet-4-5"),
            system: agent.system_prompt,
            messages: [{ role: "user", content: workshopPrompt }],
            maxOutputTokens: 800,
          });

          for await (const delta of result.textStream) {
            fullContent += delta;
            send({ type: "agent_delta", agentId: agent.id, delta });
          }

          const saved = await insertMessage({
            session_id: sessionId,
            agent_config_id: agent.id,
            role: "agent",
            content: fullContent,
            step_number: 0,
            sequence_in_step: i,
            metadata: { phase: "messaging-workshop" },
          });

          send({
            type: "agent_done",
            agentId: agent.id,
            messageId: saved.id,
            fullContent,
          });

          workshopMessages.push({ agentId: agent.id, content: fullContent });
        }

        send({ type: "phase_done", phase: "messaging-workshop" });

        // ══════════════════════════════════════════
        // PHASE 3: Critique & Debate
        // ══════════════════════════════════════════
        send({ type: "phase_start", phase: "critique-debate", phaseNumber: 3 });
        await updateSessionPhase(sessionId, "critique-debate");

        const debateRounds = config.phase_config.debate_rounds;
        const roundPrompts = [buildCritiqueRound1Prompt(), buildCritiqueRound2Prompt()];

        for (let round = 0; round < debateRounds; round++) {
          const roundPrompt = roundPrompts[round] ?? roundPrompts[0];

          // Build context: all previous workshop messages + debate rounds
          const previousContext = workshopMessages
            .map((m) => {
              const agent = agents.find((a) => a.id === m.agentId);
              return `[${agent?.name ?? "Agent"}]: ${m.content}`;
            })
            .join("\n\n");

          for (let i = 0; i < agents.length; i++) {
            const agent = agents[i];

            send({
              type: "agent_start",
              agentId: agent.id,
              agentName: agent.name,
              emoji: agent.avatar_emoji,
              color: agent.color,
              phase: "critique-debate",
            });

            const systemPrompt = `${agent.system_prompt}\n\n${roundPrompt}`;
            const debateMessages: { role: "user" | "assistant"; content: string }[] = [
              { role: "user", content: `## All Agent Messaging Drafts\n\n${previousContext}` },
            ];

            let fullContent = "";

            const result = streamText({
              model: anthropic("claude-sonnet-4-5"),
              system: systemPrompt,
              messages: debateMessages,
              maxOutputTokens: 600,
            });

            for await (const delta of result.textStream) {
              fullContent += delta;
              send({ type: "agent_delta", agentId: agent.id, delta });
            }

            const saved = await insertMessage({
              session_id: sessionId,
              agent_config_id: agent.id,
              role: "agent",
              content: fullContent,
              step_number: round + 1,
              sequence_in_step: i,
              metadata: { phase: "critique-debate", round: round + 1 },
            });

            send({
              type: "agent_done",
              agentId: agent.id,
              messageId: saved.id,
              fullContent,
            });

            // Add to context for next agents in the same round
            workshopMessages.push({ agentId: agent.id, content: fullContent });
          }
        }

        send({ type: "phase_done", phase: "critique-debate" });

        // ══════════════════════════════════════════
        // PHASE 4: Synthesis
        // ══════════════════════════════════════════
        send({ type: "phase_start", phase: "synthesis", phaseNumber: 4 });
        await updateSessionPhase(sessionId, "synthesis");

        const fullTranscript = workshopMessages
          .map((m) => {
            const agent = agents.find((a) => a.id === m.agentId);
            return `[${agent?.name ?? "Agent"}]: ${m.content}`;
          })
          .join("\n\n---\n\n");

        // Compress transcript with Haiku before synthesis
        send({ type: "phase_start", phase: "compression" as any, phaseNumber: 4 });
        const compressedTranscript = await generateText({
          model: anthropic("claude-haiku-4-5-20251001"),
          maxOutputTokens: 2000,
          prompt: `Summarize this multi-agent analysis transcript into key findings, decisions, disagreements, and recommendations. Be comprehensive but concise (max 1500 words).

TRANSCRIPT:
${fullTranscript}`,
        });
        send({ type: "phase_done", phase: "compression" as any });

        async function synthesize<T>(
          label: string,
          promptType: "messaging-framework" | "value-propositions" | "tagline-options" | "objection-responses" | "elevator-pitch" | "executive-summary",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          schema: any,
          onResult: (obj: T) => Promise<void>
        ) {
          try {
            const prompt = buildSynthesisPrompt(promptType, compressedTranscript.text, config, workspaceContext, toolInsights);
            const { object } = await generateObject({
              model: anthropic("claude-sonnet-4-5"),
              schema,
              prompt,
            });
            await onResult(object as T);
          } catch (e) {
            console.error(`Synthesis failed for ${label}:`, e);
          }
        }

        // Messaging Framework
        await synthesize<MessagingFramework>(
          "messaging-framework",
          "messaging-framework",
          MessagingFrameworkSchema,
          async (framework) => {
            const output = await insertSessionOutput({
              session_id: sessionId,
              output_type: "messaging-framework",
              title: "Messaging Framework",
              description: framework.positioning_statement.slice(0, 200),
              metadata: framework as unknown as Record<string, unknown>,
            });
            send({ type: "output_ready", outputType: "messaging-framework", outputId: output.id });
          }
        );

        // Value Propositions
        await synthesize<ValuePropositions>(
          "value-propositions",
          "value-propositions",
          ValuePropositionsSchema,
          async (result) => {
            const output = await insertSessionOutput({
              session_id: sessionId,
              output_type: "value-propositions",
              title: "Value Propositions",
              description: `${result.propositions.length} value propositions`,
              metadata: result as unknown as Record<string, unknown>,
            });
            send({ type: "output_ready", outputType: "value-propositions", outputId: output.id });
          }
        );

        // Tagline Options
        await synthesize<TaglineOptions>(
          "tagline-options",
          "tagline-options",
          TaglineOptionsSchema,
          async (result) => {
            const output = await insertSessionOutput({
              session_id: sessionId,
              output_type: "tagline-options",
              title: "Tagline Options",
              description: result.recommendation.slice(0, 200),
              metadata: result as unknown as Record<string, unknown>,
            });
            send({ type: "output_ready", outputType: "tagline-options", outputId: output.id });
          }
        );

        // Objection Responses
        await synthesize<ObjectionResponses>(
          "objection-responses",
          "objection-responses",
          ObjectionResponsesSchema,
          async (result) => {
            const output = await insertSessionOutput({
              session_id: sessionId,
              output_type: "objection-responses",
              title: "Objection Responses",
              description: `${result.objections.length} objections`,
              metadata: result as unknown as Record<string, unknown>,
            });
            send({ type: "output_ready", outputType: "objection-responses", outputId: output.id });
          }
        );

        // Elevator Pitch
        await synthesize<ElevatorPitch>(
          "elevator-pitch",
          "elevator-pitch",
          ElevatorPitchSchema,
          async (result) => {
            const output = await insertSessionOutput({
              session_id: sessionId,
              output_type: "elevator-pitch",
              title: "Elevator Pitch",
              description: result.key_hook.slice(0, 200),
              metadata: result as unknown as Record<string, unknown>,
            });
            send({ type: "output_ready", outputType: "elevator-pitch", outputId: output.id });
          }
        );

        // Executive Summary
        await synthesize<MLExecutiveSummary>(
          "executive-summary",
          "executive-summary",
          MLExecutiveSummarySchema,
          async (summary) => {
            const output = await insertSessionOutput({
              session_id: sessionId,
              output_type: "executive-summary",
              title: summary.title,
              description: summary.messaging_assessment.slice(0, 200),
              metadata: summary as unknown as Record<string, unknown>,
            });
            send({ type: "output_ready", outputType: "executive-summary", outputId: output.id });
          }
        );

        send({ type: "phase_done", phase: "synthesis" });

        // Mark session complete
        await updateSessionPhase(sessionId, "complete");
        send({ type: "analysis_complete" });
      } catch (error) {
        console.error("ML run error:", error);
        send({ type: "error", message: "An error occurred during the workshop." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
