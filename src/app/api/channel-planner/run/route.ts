import { NextRequest, NextResponse } from "next/server";
import { streamText, generateObject, generateText } from "ai";
import { requireAuth } from "@/lib/supabase/auth";
import { anthropic } from "@ai-sdk/anthropic";
import {
  getCPSession,
  getAgentsByIds,
  getWorkspaceContext,
  insertMessage,
  insertSessionOutput,
  updateSessionPhase,
} from "@/lib/channel-planner/db";
import { getToolKnowledge } from "@/lib/knowledge";
import { getToolInsights } from "@/lib/insights";
import {
  buildContextExtractionPrompt,
  buildChannelAssessmentPrompt,
  buildDebateRound1Prompt,
  buildDebateRound2Prompt,
  buildSynthesisPrompt,
} from "@/lib/channel-planner/prompts";
import {
  ChannelContextSchema,
  ChannelScorecardSchema,
  BudgetAllocationOutputSchema,
  ChannelPlaybookSchema,
  TimelineRoadmapSchema,
  ROIProjectionsSchema,
  CPExecutiveSummarySchema,
} from "@/lib/channel-planner/schemas";
import type {
  ChannelContext,
  ChannelScorecard,
  BudgetAllocationOutput,
  ChannelPlaybook,
  TimelineRoadmap,
  ROIProjections,
  CPExecutiveSummary,
} from "@/lib/channel-planner/schemas";
import type { CPSSEEvent, PlanningPhase } from "@/lib/channel-planner/types";
import type { AgentConfig } from "@/lib/debate/types";
import { z } from "zod";

function encodeSSE(event: CPSSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { sessionId } = body as { sessionId: string };

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: CPSSEEvent) => {
        controller.enqueue(new TextEncoder().encode(encodeSSE(event)));
      };

      try {
        const session = await getCPSession(sessionId);
        const config = session.config;
        const agents = await getAgentsByIds(config.analyst_agent_ids);
        const workspaceContext = await getWorkspaceContext(session.workspace_id);
        const toolInsights = await getToolInsights(config.insight_session_ids ?? []);
        const knowledgeBase = await getToolKnowledge("channel-planner");

        // ══════════════════════════════════════════
        // PHASE 1: Context Loading
        // ══════════════════════════════════════════
        send({ type: "phase_start", phase: "context-loading", phaseNumber: 1 });
        await updateSessionPhase(sessionId, "context-loading");

        const contextPrompt = buildContextExtractionPrompt(config, workspaceContext, toolInsights);

        const { object: channelContext } = await generateObject({
          model: anthropic("claude-haiku-4-5"),
          schema: ChannelContextSchema,
          prompt: contextPrompt,
        });

        await insertSessionOutput({
          session_id: sessionId,
          output_type: "channel-scorecard",
          title: "Channel Context",
          description: `${channelContext.current_channels.length} channels analyzed`,
          metadata: channelContext as unknown as Record<string, unknown>,
        });

        send({ type: "phase_done", phase: "context-loading" });

        // ══════════════════════════════════════════
        // PHASE 2: Channel Assessment
        // ══════════════════════════════════════════
        send({ type: "phase_start", phase: "channel-assessment", phaseNumber: 2 });
        await updateSessionPhase(sessionId, "channel-assessment");

        const assessmentPrompt = buildChannelAssessmentPrompt(
          channelContext,
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
            phase: "channel-assessment",
          });

          let fullContent = "";

          const result = streamText({
            model: anthropic("claude-sonnet-4-5"),
            system: agent.system_prompt,
            messages: [{ role: "user", content: assessmentPrompt }],
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
            metadata: { phase: "channel-assessment" },
          });

          send({
            type: "agent_done",
            agentId: agent.id,
            messageId: saved.id,
            fullContent,
          });

          assessmentMessages.push({ agentId: agent.id, content: fullContent });
        }

        send({ type: "phase_done", phase: "channel-assessment" });

        // ══════════════════════════════════════════
        // PHASE 3: Strategy Debate
        // ══════════════════════════════════════════
        send({ type: "phase_start", phase: "strategy-debate", phaseNumber: 3 });
        await updateSessionPhase(sessionId, "strategy-debate");

        const debateRounds = config.phase_config.debate_rounds;
        const roundPrompts = [buildDebateRound1Prompt(), buildDebateRound2Prompt()];

        for (let round = 0; round < debateRounds; round++) {
          const roundPrompt = roundPrompts[round] ?? roundPrompts[0];

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
              phase: "strategy-debate",
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
              metadata: { phase: "strategy-debate", round: round + 1 },
            });

            send({
              type: "agent_done",
              agentId: agent.id,
              messageId: saved.id,
              fullContent,
            });

            assessmentMessages.push({ agentId: agent.id, content: fullContent });
          }
        }

        send({ type: "phase_done", phase: "strategy-debate" });

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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async function synthesize<T>(
          label: string,
          promptType: "channel-scorecard" | "budget-allocation" | "channel-playbooks" | "timeline-roadmap" | "roi-projections" | "executive-summary",
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

        // Channel Scorecard
        await synthesize<ChannelScorecard>(
          "channel-scorecard",
          "channel-scorecard",
          ChannelScorecardSchema,
          async (scorecard) => {
            const output = await insertSessionOutput({
              session_id: sessionId,
              output_type: "channel-scorecard",
              title: "Channel Scorecard",
              description: scorecard.overall_assessment.slice(0, 200),
              metadata: scorecard as unknown as Record<string, unknown>,
            });
            send({ type: "output_ready", outputType: "channel-scorecard", outputId: output.id });
          }
        );

        // Budget Allocation
        await synthesize<BudgetAllocationOutput>(
          "budget-allocation",
          "budget-allocation",
          BudgetAllocationOutputSchema,
          async (allocation) => {
            const output = await insertSessionOutput({
              session_id: sessionId,
              output_type: "budget-allocation",
              title: "Budget Allocation Plan",
              description: allocation.reallocation_summary.slice(0, 200),
              metadata: allocation as unknown as Record<string, unknown>,
            });
            send({ type: "output_ready", outputType: "budget-allocation", outputId: output.id });
          }
        );

        // Channel Playbooks
        await synthesize<{ playbooks: ChannelPlaybook[] }>(
          "channel-playbooks",
          "channel-playbooks",
          z.object({ playbooks: z.array(ChannelPlaybookSchema) }),
          async (result) => {
            for (const pb of result.playbooks) {
              const output = await insertSessionOutput({
                session_id: sessionId,
                output_type: "channel-playbook",
                title: `Playbook: ${pb.channel_name}`,
                description: pb.objective,
                metadata: pb as unknown as Record<string, unknown>,
              });
              send({ type: "output_ready", outputType: "channel-playbook", outputId: output.id });
            }
          }
        );

        // Timeline Roadmap
        await synthesize<TimelineRoadmap>(
          "timeline-roadmap",
          "timeline-roadmap",
          TimelineRoadmapSchema,
          async (roadmap) => {
            const output = await insertSessionOutput({
              session_id: sessionId,
              output_type: "timeline-roadmap",
              title: "Timeline Roadmap",
              description: roadmap.critical_path.slice(0, 200),
              metadata: roadmap as unknown as Record<string, unknown>,
            });
            send({ type: "output_ready", outputType: "timeline-roadmap", outputId: output.id });
          }
        );

        // ROI Projections
        await synthesize<ROIProjections>(
          "roi-projections",
          "roi-projections",
          ROIProjectionsSchema,
          async (projections) => {
            const output = await insertSessionOutput({
              session_id: sessionId,
              output_type: "roi-projections",
              title: "ROI Projections",
              description: `Blended CAC: $${projections.blended_cac} | Pipeline: $${projections.total_expected_pipeline}`,
              metadata: projections as unknown as Record<string, unknown>,
            });
            send({ type: "output_ready", outputType: "roi-projections", outputId: output.id });
          }
        );

        // Executive Summary
        await synthesize<CPExecutiveSummary>(
          "executive-summary",
          "executive-summary",
          CPExecutiveSummarySchema,
          async (summary) => {
            const output = await insertSessionOutput({
              session_id: sessionId,
              output_type: "executive-summary",
              title: summary.title,
              description: summary.channel_landscape.slice(0, 200),
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
        console.error("CP run error:", error);
        send({ type: "error", message: "An error occurred during the channel planning analysis." });
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
