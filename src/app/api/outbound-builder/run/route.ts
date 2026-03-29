import { NextRequest, NextResponse } from "next/server";
import { streamText, generateObject } from "ai";
import { requireAuth } from "@/lib/supabase/auth";
import { anthropic } from "@ai-sdk/anthropic";
import {
  getOBSession,
  getAgentsByIds,
  getWorkspaceContext,
  insertMessage,
  insertSessionOutput,
  updateSessionPhase,
} from "@/lib/outbound-builder/db";
import { getToolKnowledge } from "@/lib/knowledge";
import { getToolInsights } from "@/lib/insights";
import {
  buildCampaignDataPrompt,
  buildAnalyzerAssessmentPrompt,
  buildAnalyzerDebateRound1Prompt,
  buildAnalyzerDebateRound2Prompt,
  buildPlaybookSynthesisPrompt,
} from "@/lib/outbound-builder/prompts";
import { CampaignKPISummarySchema, StrategicPlaybookSchema } from "@/lib/outbound-builder/schemas";
import type { OBSSEEvent, AnalyzerSessionConfig } from "@/lib/outbound-builder/types";

function encodeSSE(event: OBSSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { sessionId } = body as { sessionId: string };

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: OBSSEEvent) => {
        controller.enqueue(new TextEncoder().encode(encodeSSE(event)));
      };

      try {
        const session = await getOBSession(sessionId);
        const config = session.config as AnalyzerSessionConfig;
        const agents = await getAgentsByIds(config.analyst_agent_ids);
        const workspaceContext = await getWorkspaceContext(session.workspace_id);
        const toolInsights = await getToolInsights(config.insight_session_ids ?? []);
        const knowledgeBase = await getToolKnowledge("outbound-builder");

        // Flatten all campaign rows
        const allRows = config.campaign_data.flatMap((ds) => ds.rows);

        // ══════════════════════════════════════════
        // PHASE 1: Data Processing
        // ══════════════════════════════════════════
        send({ type: "phase_start", phase: "data-processing", phaseNumber: 1 });
        await updateSessionPhase(sessionId, "data-processing");

        const kpiPrompt = buildCampaignDataPrompt(allRows, workspaceContext, toolInsights);
        const { object: kpiSummary } = await generateObject({
          model: anthropic("claude-haiku-4-5"),
          schema: CampaignKPISummarySchema,
          prompt: kpiPrompt,
        });

        await insertSessionOutput({
          session_id: sessionId,
          output_type: "campaign-kpi-summary",
          title: "Campaign KPI Summary",
          description: `${kpiSummary.total_campaigns_analyzed} campaigns analyzed — top: ${kpiSummary.top_performing_campaign.name}`,
          metadata: kpiSummary as unknown as Record<string, unknown>,
        });

        send({ type: "phase_done", phase: "data-processing" });

        // ══════════════════════════════════════════
        // PHASE 2: Analyst Assessment
        // ══════════════════════════════════════════
        send({ type: "phase_start", phase: "analyst-assessment", phaseNumber: 2 });
        await updateSessionPhase(sessionId, "analyst-assessment");

        const kpiText = JSON.stringify(kpiSummary, null, 2);
        const assessmentPrompt = buildAnalyzerAssessmentPrompt(
          allRows,
          kpiText,
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

          send({ type: "agent_done", agentId: agent.id, messageId: saved.id, fullContent });
          assessmentMessages.push({ agentId: agent.id, content: fullContent });
        }

        send({ type: "phase_done", phase: "analyst-assessment" });

        // ══════════════════════════════════════════
        // PHASE 3: Debate
        // ══════════════════════════════════════════
        send({ type: "phase_start", phase: "debate", phaseNumber: 3 });
        await updateSessionPhase(sessionId, "debate");

        const debateRounds = config.phase_config.debate_rounds;
        const roundPrompts = [buildAnalyzerDebateRound1Prompt(), buildAnalyzerDebateRound2Prompt()];

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

            let fullContent = "";
            const result = streamText({
              model: anthropic("claude-sonnet-4-5"),
              system: `${agent.system_prompt}\n\n${roundPrompt}`,
              messages: [{ role: "user", content: `## All Analyst Assessments\n\n${previousContext}` }],
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

            send({ type: "agent_done", agentId: agent.id, messageId: saved.id, fullContent });
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

        try {
          const playbookPrompt = buildPlaybookSynthesisPrompt(fullTranscript, allRows, workspaceContext, toolInsights);
          const { object: playbook } = await generateObject({
            model: anthropic("claude-sonnet-4-5"),
            schema: StrategicPlaybookSchema,
            prompt: playbookPrompt,
          });

          const output = await insertSessionOutput({
            session_id: sessionId,
            output_type: "strategic-playbook",
            title: "Strategic Outbound Playbook",
            description: playbook.executive_summary.slice(0, 200),
            metadata: playbook as unknown as Record<string, unknown>,
          });

          send({ type: "output_ready", outputType: "strategic-playbook", outputId: output.id });
        } catch (e) {
          console.error("Playbook synthesis failed:", e);
        }

        send({ type: "phase_done", phase: "synthesis" });

        await updateSessionPhase(sessionId, "complete");
        send({ type: "analysis_complete" });
      } catch (error) {
        console.error("OB analyzer run error:", error);
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
