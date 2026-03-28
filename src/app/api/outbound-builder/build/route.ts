import { NextRequest } from "next/server";
import { streamText, generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  getOBSession,
  getAgentsByIds,
  getWorkspaceContext,
  getSessionOutputs,
  insertMessage,
  insertSessionOutput,
  updateSessionPhase,
} from "@/lib/outbound-builder/db";
import { getToolInsights } from "@/lib/insights";
import {
  buildStrategyDebatePrompt,
  buildBuilderDebateRound2Prompt,
  buildSequenceGenerationPrompt,
} from "@/lib/outbound-builder/prompts";
import { SequencePackageSchema } from "@/lib/outbound-builder/schemas";
import type { OBSSEEvent, BuilderSessionConfig } from "@/lib/outbound-builder/types";

function encodeSSE(event: OBSSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { sessionId } = body as { sessionId: string };

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: OBSSEEvent) => {
        controller.enqueue(new TextEncoder().encode(encodeSSE(event)));
      };

      try {
        const session = await getOBSession(sessionId);
        const config = session.config as BuilderSessionConfig;
        const agents = await getAgentsByIds(config.analyst_agent_ids);
        const workspaceContext = await getWorkspaceContext(session.workspace_id);
        const toolInsights = await getToolInsights(config.insight_session_ids ?? []);

        // ══════════════════════════════════════════
        // PHASE 1: Context Loading
        // ══════════════════════════════════════════
        send({ type: "phase_start", phase: "context-loading", phaseNumber: 1 });
        await updateSessionPhase(sessionId, "context-loading");

        // Load playbook if pipeline mode
        let playbookContext = "";
        if (config.playbook_session_id) {
          const outputs = await getSessionOutputs(config.playbook_session_id);
          const playbook = outputs.find((o) => o.output_type === "strategic-playbook");
          if (playbook) {
            const m = playbook.metadata as Record<string, unknown>;
            const recs = (m.top_recommendations as string[]) ?? [];
            const summary = m.executive_summary ?? "";
            const channels = (m.channel_analysis as Array<{ channel: string; effectiveness: string; best_use_case: string }>) ?? [];
            playbookContext = [
              `**Executive Summary**: ${summary}`,
              channels.length > 0
                ? `**Channel Analysis**: ${channels.map((c) => `${c.channel} (${c.effectiveness}): ${c.best_use_case}`).join("; ")}`
                : "",
              recs.length > 0 ? `**Top Recommendations**: ${recs.join("; ")}` : "",
            ]
              .filter(Boolean)
              .join("\n");
          }
        }

        send({ type: "phase_done", phase: "context-loading" });

        // ══════════════════════════════════════════
        // PHASE 2: Strategy Generation (Debate)
        // ══════════════════════════════════════════
        send({ type: "phase_start", phase: "strategy-generation", phaseNumber: 2 });
        await updateSessionPhase(sessionId, "strategy-generation");

        const strategyPrompt = buildStrategyDebatePrompt(
          config.icp,
          config.channels,
          config.sequence_params,
          workspaceContext,
          playbookContext,
          toolInsights
        );

        const debateMessages: { agentId: string; content: string }[] = [];

        // Round 1: Initial assessments
        for (let i = 0; i < agents.length; i++) {
          const agent = agents[i];
          send({
            type: "agent_start",
            agentId: agent.id,
            agentName: agent.name,
            emoji: agent.avatar_emoji,
            color: agent.color,
            phase: "strategy-generation",
          });

          let fullContent = "";
          const result = streamText({
            model: anthropic("claude-sonnet-4-5"),
            system: agent.system_prompt,
            messages: [{ role: "user", content: strategyPrompt }],
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
            metadata: { phase: "strategy-generation", round: 1 },
          });

          send({ type: "agent_done", agentId: agent.id, messageId: saved.id, fullContent });
          debateMessages.push({ agentId: agent.id, content: fullContent });
        }

        // Round 2: Final positions
        const round2Prompt = buildBuilderDebateRound2Prompt();
        const previousContext = debateMessages
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
            phase: "strategy-generation",
          });

          let fullContent = "";
          const result = streamText({
            model: anthropic("claude-sonnet-4-5"),
            system: `${agent.system_prompt}\n\n${round2Prompt}`,
            messages: [{ role: "user", content: `## All Assessments\n\n${previousContext}` }],
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
            step_number: 1,
            sequence_in_step: i,
            metadata: { phase: "strategy-generation", round: 2 },
          });

          send({ type: "agent_done", agentId: agent.id, messageId: saved.id, fullContent });
          debateMessages.push({ agentId: agent.id, content: fullContent });
        }

        send({ type: "phase_done", phase: "strategy-generation" });

        // ══════════════════════════════════════════
        // PHASE 3: Sequence Drafting
        // ══════════════════════════════════════════
        send({ type: "phase_start", phase: "sequence-drafting", phaseNumber: 3 });
        await updateSessionPhase(sessionId, "sequence-drafting");

        const fullTranscript = debateMessages
          .map((m) => {
            const agent = agents.find((a) => a.id === m.agentId);
            return `[${agent?.name ?? "Agent"}]: ${m.content}`;
          })
          .join("\n\n---\n\n");

        try {
          const seqPrompt = buildSequenceGenerationPrompt(
            config.icp,
            config.channels,
            config.sequence_params,
            fullTranscript,
            workspaceContext,
            playbookContext,
            toolInsights
          );

          const { object: seqPackage } = await generateObject({
            model: anthropic("claude-sonnet-4-5"),
            schema: SequencePackageSchema,
            prompt: seqPrompt,
          });

          // Save each sequence as an output
          for (const seq of seqPackage.sequences) {
            const output = await insertSessionOutput({
              session_id: sessionId,
              output_type: "outbound-sequence",
              title: seq.sequence_name,
              description: `${seq.total_touchpoints} touchpoints over ${seq.total_duration_days} days`,
              metadata: seq as unknown as Record<string, unknown>,
            });
            send({ type: "output_ready", outputType: "outbound-sequence", outputId: output.id });
          }

          // Save A/B variants if present
          if (seqPackage.ab_variants?.length) {
            const output = await insertSessionOutput({
              session_id: sessionId,
              output_type: "ab-variants",
              title: "A/B Test Variants",
              description: `${seqPackage.ab_variants.length} variant pairs`,
              metadata: { variants: seqPackage.ab_variants, expected_metrics: seqPackage.expected_metrics } as Record<string, unknown>,
            });
            send({ type: "output_ready", outputType: "ab-variants", outputId: output.id });
          }

          // Save full package
          const pkgOutput = await insertSessionOutput({
            session_id: sessionId,
            output_type: "sequence-package",
            title: "Full Sequence Package",
            description: seqPackage.overall_strategy.slice(0, 200),
            metadata: seqPackage as unknown as Record<string, unknown>,
          });
          send({ type: "output_ready", outputType: "sequence-package", outputId: pkgOutput.id });
        } catch (e) {
          console.error("Sequence generation failed:", e);
        }

        send({ type: "phase_done", phase: "sequence-drafting" });

        await updateSessionPhase(sessionId, "complete");
        send({ type: "analysis_complete" });
      } catch (error) {
        console.error("OB builder run error:", error);
        send({ type: "error", message: "An error occurred during sequence generation." });
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
