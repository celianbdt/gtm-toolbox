import { NextRequest } from "next/server";
import { streamText, generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  getCISession,
  getAgentsByIds,
  getWorkspaceContext,
  insertMessage,
  insertSessionOutput,
  updateSessionPhase,
} from "@/lib/competitive-intel/db";
import { getToolKnowledge } from "@/lib/knowledge";
import { getToolInsights } from "@/lib/insights";
import {
  buildIntelExtractionPrompt,
  buildAnalystAssessmentPrompt,
  buildDebateRound1Prompt,
  buildDebateRound2Prompt,
  buildSynthesisPrompt,
} from "@/lib/competitive-intel/prompts";
import {
  IntelBriefSchema,
  BattleCardSchema,
  PositioningMatrixSchema,
  ObjectionPlaybookSchema,
  ThreatAssessmentSchema,
  ExecutiveSummarySchema,
} from "@/lib/competitive-intel/schemas";
import type { IntelBrief, BattleCard, PositioningMatrix, ObjectionPlaybook, ThreatAssessment, ExecutiveSummary } from "@/lib/competitive-intel/schemas";
import type { CISSEEvent, AnalysisPhase } from "@/lib/competitive-intel/types";
import type { AgentConfig } from "@/lib/debate/types";
import { z } from "zod";

function encodeSSE(event: CISSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { sessionId } = body as { sessionId: string };

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: CISSEEvent) => {
        controller.enqueue(new TextEncoder().encode(encodeSSE(event)));
      };

      try {
        const session = await getCISession(sessionId);
        const config = session.config;
        const agents = await getAgentsByIds(config.analyst_agent_ids);
        const workspaceContext = await getWorkspaceContext(session.workspace_id);
        const toolInsights = await getToolInsights(config.insight_session_ids ?? []);
        const knowledgeBase = await getToolKnowledge("competitive-intel");

        // ══════════════════════════════════════════
        // PHASE 1: Data Processing
        // ══════════════════════════════════════════
        send({ type: "phase_start", phase: "data-processing", phaseNumber: 1 });
        await updateSessionPhase(sessionId, "data-processing");

        const intelBriefs: { competitor: string; brief: IntelBrief }[] = [];

        for (const competitor of config.competitors) {
          const prompt = buildIntelExtractionPrompt(competitor, workspaceContext, toolInsights);

          const { object: brief } = await generateObject({
            model: anthropic("claude-haiku-4-5"),
            schema: IntelBriefSchema,
            prompt,
          });

          intelBriefs.push({ competitor: competitor.name, brief });

          await insertSessionOutput({
            session_id: sessionId,
            output_type: "intel-brief",
            title: `Intel Brief: ${competitor.name}`,
            description: brief.positioning_statement,
            metadata: brief as unknown as Record<string, unknown>,
          });
        }

        send({ type: "phase_done", phase: "data-processing" });

        // ══════════════════════════════════════════
        // PHASE 2: Individual Analyst Assessments
        // ══════════════════════════════════════════
        send({ type: "phase_start", phase: "analyst-assessment", phaseNumber: 2 });
        await updateSessionPhase(sessionId, "analyst-assessment");

        const assessmentPrompt = buildAnalystAssessmentPrompt(
          intelBriefs,
          config.focus_dimensions,
          config.custom_question,
          workspaceContext,
          knowledgeBase,
          toolInsights
        );

        const assessmentMessages: { agentId: string; content: string }[] = [];

        for (let i = 0; i < agents.length; i++) {
          const agent = agents[i];

          send({
            type: "agent_start",
            agentId: agent.id,
            agentName: agent.name,
            emoji: agent.avatar_emoji,
            color: agent.color,
            phase: "analyst-assessment",
          });

          let fullContent = "";

          const result = streamText({
            model: anthropic("claude-sonnet-4-5"),
            system: agent.system_prompt,
            messages: [{ role: "user", content: assessmentPrompt }],
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
            metadata: { phase: "analyst-assessment" },
          });

          send({
            type: "agent_done",
            agentId: agent.id,
            messageId: saved.id,
            fullContent,
          });

          assessmentMessages.push({ agentId: agent.id, content: fullContent });
        }

        send({ type: "phase_done", phase: "analyst-assessment" });

        // ══════════════════════════════════════════
        // PHASE 3: Cross-Analyst Debate
        // ══════════════════════════════════════════
        send({ type: "phase_start", phase: "debate", phaseNumber: 3 });
        await updateSessionPhase(sessionId, "debate");

        const debateRounds = config.phase_config.debate_rounds;
        const roundPrompts = [buildDebateRound1Prompt(), buildDebateRound2Prompt()];

        for (let round = 0; round < debateRounds; round++) {
          const roundPrompt = roundPrompts[round] ?? roundPrompts[0];

          // Build context: all previous assessments + debate rounds
          const previousContext = assessmentMessages
            .map((m) => {
              const agent = agents.find((a) => a.id === m.agentId);
              return `[${agent?.name ?? "Analyst"}]: ${m.content}`;
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
              phase: "debate",
            });

            const systemPrompt = `${agent.system_prompt}\n\n${roundPrompt}`;
            const debateMessages: { role: "user" | "assistant"; content: string }[] = [
              { role: "user", content: `## All Analyst Assessments\n\n${previousContext}` },
            ];

            let fullContent = "";

            const result = streamText({
              model: anthropic("claude-sonnet-4-5"),
              system: systemPrompt,
              messages: debateMessages,
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
              metadata: { phase: "debate", round: round + 1 },
            });

            send({
              type: "agent_done",
              agentId: agent.id,
              messageId: saved.id,
              fullContent,
            });

            // Add to context for next agents in the same round
            assessmentMessages.push({ agentId: agent.id, content: fullContent });
          }
        }

        send({ type: "phase_done", phase: "debate" });

        // ══════════════════════════════════════════
        // PHASE 4: Synthesis
        // ══════════════════════════════════════════
        send({ type: "phase_start", phase: "synthesis", phaseNumber: 4 });
        await updateSessionPhase(sessionId, "synthesis");

        const fullTranscript = assessmentMessages
          .map((m) => {
            const agent = agents.find((a) => a.id === m.agentId);
            return `[${agent?.name ?? "Analyst"}]: ${m.content}`;
          })
          .join("\n\n---\n\n");

        const competitorNames = config.competitors.map((c) => c.name);

        // Each synthesis step wrapped individually so partial results are saved
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async function synthesize<T>(
          label: string,
          promptType: "battle-cards" | "positioning-matrix" | "objection-playbook" | "threat-assessment" | "executive-summary",
          schema: any,
          onResult: (obj: T) => Promise<void>
        ) {
          try {
            const prompt = buildSynthesisPrompt(promptType, fullTranscript, competitorNames, workspaceContext, toolInsights);
            const { object } = await generateObject({
              model: anthropic("claude-sonnet-4-5"),
              schema,
              prompt,
            });
            await onResult(object as T);
          } catch (e) {
            console.error(`Synthesis failed for ${label}:`, e);
            // Continue — don't abort entire synthesis
          }
        }

        // Battle Cards
        await synthesize<{ cards: BattleCard[] }>(
          "battle-cards",
          "battle-cards",
          z.object({ cards: z.array(BattleCardSchema) }),
          async (result) => {
            for (const card of result.cards) {
              const output = await insertSessionOutput({
                session_id: sessionId,
                output_type: "battle-card",
                title: `Battle Card: ${card.competitor_name}`,
                description: card.one_liner,
                metadata: card as unknown as Record<string, unknown>,
              });
              send({ type: "output_ready", outputType: "battle-card", outputId: output.id });
            }
          }
        );

        // Positioning Matrix
        await synthesize<PositioningMatrix>(
          "positioning-matrix",
          "positioning-matrix",
          PositioningMatrixSchema,
          async (matrix) => {
            const output = await insertSessionOutput({
              session_id: sessionId,
              output_type: "positioning-matrix",
              title: "Positioning Matrix",
              description: matrix.insight.slice(0, 200),
              metadata: matrix as unknown as Record<string, unknown>,
            });
            send({ type: "output_ready", outputType: "positioning-matrix", outputId: output.id });
          }
        );

        // Objection Playbooks
        await synthesize<{ playbooks: ObjectionPlaybook[] }>(
          "objection-playbook",
          "objection-playbook",
          z.object({ playbooks: z.array(ObjectionPlaybookSchema) }),
          async (result) => {
            for (const pb of result.playbooks) {
              const output = await insertSessionOutput({
                session_id: sessionId,
                output_type: "objection-playbook",
                title: `Objections: ${pb.competitor_name}`,
                description: `${pb.objections.length} objections`,
                metadata: pb as unknown as Record<string, unknown>,
              });
              send({ type: "output_ready", outputType: "objection-playbook", outputId: output.id });
            }
          }
        );

        // Threat Assessment
        await synthesize<ThreatAssessment>(
          "threat-assessment",
          "threat-assessment",
          ThreatAssessmentSchema,
          async (threats) => {
            const output = await insertSessionOutput({
              session_id: sessionId,
              output_type: "threat-assessment",
              title: "Threat & Opportunity Assessment",
              description: threats.overall_competitive_position.slice(0, 200),
              metadata: threats as unknown as Record<string, unknown>,
            });
            send({ type: "output_ready", outputType: "threat-assessment", outputId: output.id });
          }
        );

        // Executive Summary
        await synthesize<ExecutiveSummary>(
          "executive-summary",
          "executive-summary",
          ExecutiveSummarySchema,
          async (summary) => {
            const output = await insertSessionOutput({
              session_id: sessionId,
              output_type: "executive-summary" as any,
              title: summary.title,
              description: summary.competitive_landscape.slice(0, 200),
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
        console.error("CI run error:", error);
        send({ type: "error", message: "An error occurred during the analysis." });
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
