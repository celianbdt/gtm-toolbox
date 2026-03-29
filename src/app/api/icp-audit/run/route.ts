import { NextRequest, NextResponse } from "next/server";
import { streamText, generateObject, generateText } from "ai";
import { requireAuth } from "@/lib/supabase/auth";
import { anthropic } from "@ai-sdk/anthropic";
import {
  getICASession,
  getAgentsByIds,
  getWorkspaceContext,
  insertMessage,
  insertSessionOutput,
  updateSessionPhase,
} from "@/lib/icp-audit/db";
import { getToolKnowledge } from "@/lib/knowledge";
import { getToolInsights } from "@/lib/insights";
import {
  buildDataExtractionPrompt,
  buildWinLossExtractionPrompt,
  buildAnalystAssessmentPrompt,
  buildDebateRound1Prompt,
  buildDebateRound2Prompt,
  buildSynthesisPrompt,
} from "@/lib/icp-audit/prompts";
import {
  CustomerDataExtractSchema,
  ICPScorecardSchema,
  SegmentAnalysisSchema,
  PersonaCardSchema,
  TAMSAMAnalysisSchema,
  PrioritizationMatrixSchema,
  ICAExecutiveSummarySchema,
} from "@/lib/icp-audit/schemas";
import type {
  CustomerDataExtract,
  ICPScorecard,
  SegmentAnalysis,
  PersonaCard,
  TAMSAMAnalysis,
  PrioritizationMatrix,
  ICAExecutiveSummary,
} from "@/lib/icp-audit/schemas";
import type { ICASSEEvent, AuditPhase } from "@/lib/icp-audit/types";
import type { AgentConfig } from "@/lib/debate/types";
import { z } from "zod";

function encodeSSE(event: ICASSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { sessionId } = body as { sessionId: string };

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ICASSEEvent) => {
        controller.enqueue(new TextEncoder().encode(encodeSSE(event)));
      };

      try {
        const session = await getICASession(sessionId);
        const config = session.config;
        const agents = await getAgentsByIds(config.analyst_agent_ids);
        const workspaceContext = await getWorkspaceContext(session.workspace_id);
        const toolInsights = await getToolInsights(config.insight_session_ids ?? []);
        const knowledgeBase = await getToolKnowledge("icp-audit");

        // ══════════════════════════════════════════
        // PHASE 1: Data Processing
        // ══════════════════════════════════════════
        send({ type: "phase_start", phase: "data-processing", phaseNumber: 1 });
        await updateSessionPhase(sessionId, "data-processing");

        const dataExtracts: { source: string; extract: CustomerDataExtract }[] = [];

        // Process customer data sources
        for (const source of config.customer_data) {
          const prompt = buildDataExtractionPrompt(
            source,
            config.icp_definition,
            config.segments,
            workspaceContext,
            toolInsights
          );

          const { object: extract } = await generateObject({
            model: anthropic("claude-haiku-4-5"),
            schema: CustomerDataExtractSchema,
            prompt,
          });

          dataExtracts.push({ source: source.title, extract });

          await insertSessionOutput({
            session_id: sessionId,
            output_type: "icp-scorecard",
            title: `Data Extract: ${source.title}`,
            description: `${extract.segments_detected.length} segments detected`,
            metadata: extract as unknown as Record<string, unknown>,
          });
        }

        // Process win/loss data if present
        if (config.win_loss_data.length > 0) {
          const wlPrompt = buildWinLossExtractionPrompt(
            config.win_loss_data,
            config.segments,
            workspaceContext
          );

          const { object: wlExtract } = await generateObject({
            model: anthropic("claude-haiku-4-5"),
            schema: CustomerDataExtractSchema,
            prompt: wlPrompt,
          });

          dataExtracts.push({ source: "Win/Loss Data", extract: wlExtract });
        }

        send({ type: "phase_done", phase: "data-processing" });

        // ══════════════════════════════════════════
        // PHASE 2: Individual Analyst Assessments
        // ══════════════════════════════════════════
        send({ type: "phase_start", phase: "analyst-assessment", phaseNumber: 2 });
        await updateSessionPhase(sessionId, "analyst-assessment");

        const assessmentPrompt = buildAnalystAssessmentPrompt(
          dataExtracts,
          config.icp_definition,
          config.segments,
          config.personas,
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
              metadata: { phase: "debate", round: round + 1 },
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
          promptType: Parameters<typeof buildSynthesisPrompt>[0],
          schema: any,
          onResult: (obj: T) => Promise<void>
        ) {
          try {
            const prompt = buildSynthesisPrompt(
              promptType,
              compressedTranscript.text,
              config.icp_definition,
              config.segments,
              config.personas,
              workspaceContext,
              toolInsights
            );
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

        // ICP Scorecard
        await synthesize<ICPScorecard>(
          "icp-scorecard",
          "icp-scorecard",
          ICPScorecardSchema,
          async (scorecard) => {
            const output = await insertSessionOutput({
              session_id: sessionId,
              output_type: "icp-scorecard",
              title: "ICP Scorecard",
              description: scorecard.overall_assessment.slice(0, 200),
              confidence_score: scorecard.overall_score,
              metadata: scorecard as unknown as Record<string, unknown>,
            });
            send({ type: "output_ready", outputType: "icp-scorecard", outputId: output.id });
          }
        );

        // Segment Analysis
        await synthesize<{ segments: SegmentAnalysis[] }>(
          "segment-analysis",
          "segment-analysis",
          z.object({ segments: z.array(SegmentAnalysisSchema) }),
          async (result) => {
            for (const seg of result.segments) {
              const output = await insertSessionOutput({
                session_id: sessionId,
                output_type: "segment-analysis",
                title: `Segment: ${seg.segment_name}`,
                description: `${seg.recommendation} (fit: ${seg.fit_score}/100)`,
                confidence_score: seg.fit_score,
                metadata: seg as unknown as Record<string, unknown>,
              });
              send({ type: "output_ready", outputType: "segment-analysis", outputId: output.id });
            }
          }
        );

        // Persona Cards
        await synthesize<{ personas: PersonaCard[] }>(
          "persona-cards",
          "persona-cards",
          z.object({ personas: z.array(PersonaCardSchema) }),
          async (result) => {
            for (const persona of result.personas) {
              const output = await insertSessionOutput({
                session_id: sessionId,
                output_type: "persona-card",
                title: `Persona: ${persona.persona_title}`,
                description: persona.messaging_angle.slice(0, 200),
                confidence_score: persona.confidence,
                metadata: persona as unknown as Record<string, unknown>,
              });
              send({ type: "output_ready", outputType: "persona-card", outputId: output.id });
            }
          }
        );

        // TAM/SAM Analysis
        await synthesize<TAMSAMAnalysis>(
          "tam-sam-analysis",
          "tam-sam-analysis",
          TAMSAMAnalysisSchema,
          async (tamSam) => {
            const output = await insertSessionOutput({
              session_id: sessionId,
              output_type: "tam-sam-analysis",
              title: "TAM / SAM / SOM Analysis",
              description: `TAM: ${tamSam.tam_estimate} | SAM: ${tamSam.sam_estimate} | SOM: ${tamSam.som_estimate}`,
              metadata: tamSam as unknown as Record<string, unknown>,
            });
            send({ type: "output_ready", outputType: "tam-sam-analysis", outputId: output.id });
          }
        );

        // Prioritization Matrix
        await synthesize<PrioritizationMatrix>(
          "prioritization-matrix",
          "prioritization-matrix",
          PrioritizationMatrixSchema,
          async (matrix) => {
            const output = await insertSessionOutput({
              session_id: sessionId,
              output_type: "prioritization-matrix",
              title: "Segment Prioritization Matrix",
              description: matrix.recommendation.slice(0, 200),
              metadata: matrix as unknown as Record<string, unknown>,
            });
            send({ type: "output_ready", outputType: "prioritization-matrix", outputId: output.id });
          }
        );

        // Executive Summary
        await synthesize<ICAExecutiveSummary>(
          "executive-summary",
          "executive-summary",
          ICAExecutiveSummarySchema,
          async (summary) => {
            const output = await insertSessionOutput({
              session_id: sessionId,
              output_type: "executive-summary",
              title: summary.title,
              description: `ICP Health: ${summary.icp_health}`,
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
        console.error("ICA run error:", error);
        send({ type: "error", message: "An error occurred during the audit." });
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
