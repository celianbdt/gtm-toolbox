import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { requireAuth } from "@/lib/supabase/auth";
import { getWorkspaceAPIKeys, getModelForAgent } from "@/lib/ai/provider";
import {
  getSession,
  getAgentsByIds,
  getSessionMessages,
  getWorkspaceContext,
  insertMessage,
  incrementTurn,
} from "@/lib/debate/db";
import { getToolInsights } from "@/lib/insights";
import { selectRespondingAgents } from "@/lib/debate/scoring";
import type { SSEEvent, AgentConfig, DebateMessage } from "@/lib/debate/types";

function encodeSSE(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function buildAgentMessages(
  agent: AgentConfig,
  mission: string,
  workspaceContext: string,
  toolInsights: string,
  history: DebateMessage[],
  agentsMap: Map<string, AgentConfig>,
  currentStepMessages: { agentId: string; content: string }[]
) {
  const contextBlock = workspaceContext
    ? `\n\n## Company Context\n${workspaceContext}`
    : "";

  const insightsBlock = toolInsights
    ? `\n\n${toolInsights}`
    : "";

  const systemPrompt = `${agent.system_prompt}${contextBlock}${insightsBlock}

## Debate Mission
${mission}

## Debate Rules
- You are ${agent.name} (${agent.role}). This is your ONLY identity. Never adopt other roles, personas, or sub-characters.
- Write as a single voice — YOUR voice. Do not create sections labeled with other role names.
- Be direct, opinionated, and stay true to your personality.
- Reference what others have said when relevant — agree, disagree, or build on it.
- Keep responses focused and under 150 words. Be concise.
- Never break character. Never say you are an AI.
- Never structure your response as if multiple people are speaking.`;

  const messages: { role: "user" | "assistant"; content: string }[] = [];

  // Build history as alternating turns
  const stepGroups = new Map<number, DebateMessage[]>();
  for (const msg of history) {
    if (!stepGroups.has(msg.step_number)) stepGroups.set(msg.step_number, []);
    stepGroups.get(msg.step_number)!.push(msg);
  }

  for (const [, stepMsgs] of [...stepGroups.entries()].sort(([a], [b]) => a - b)) {
    const sorted = [...stepMsgs].sort((a, b) => a.sequence_in_step - b.sequence_in_step);
    for (const msg of sorted) {
      if (msg.role === "user") {
        messages.push({ role: "user", content: msg.content });
      } else if (msg.role === "agent" && msg.agent_config_id) {
        const speaker = agentsMap.get(msg.agent_config_id);
        const prefix = speaker ? `[${speaker.name} — ${speaker.role}]: ` : "";
        if (msg.agent_config_id === agent.id) {
          messages.push({ role: "assistant", content: msg.content });
        } else {
          messages.push({ role: "user", content: `${prefix}${msg.content}` });
        }
      }
    }
  }

  // Append current step's already-responded agents
  for (const { agentId, content } of currentStepMessages) {
    const speaker = agentsMap.get(agentId);
    const prefix = speaker ? `[${speaker.name} — ${speaker.role}]: ` : "";
    messages.push({ role: "user", content: `${prefix}${content}` });
  }

  return { system: systemPrompt, messages };
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { sessionId, userMessage, workspaceId } = body as {
    sessionId: string;
    userMessage: string;
    workspaceId: string;
  };

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SSEEvent) => {
        controller.enqueue(new TextEncoder().encode(encodeSSE(event)));
      };

      try {
        // Load session data
        const session = await getSession(sessionId);
        const config = session.config;
        const agents = await getAgentsByIds(config.agent_ids);
        const agentsMap = new Map(agents.map((a) => [a.id, a]));
        const workspaceContext = await getWorkspaceContext(workspaceId);
        const toolInsights = await getToolInsights(config.insight_session_ids ?? []);
        const history = await getSessionMessages(sessionId);
        const keys = await getWorkspaceAPIKeys(workspaceId);
        const sessionModels: string[] = config.models ?? ["claude-sonnet-4-5"];

        const stepNumber = config.current_turn;

        // Persist human message
        await insertMessage({
          session_id: sessionId,
          agent_config_id: null,
          role: "user",
          content: userMessage,
          step_number: stepNumber,
          sequence_in_step: 0,
          metadata: {},
        });

        // Select responding agents
        const responding = selectRespondingAgents(agents, userMessage);
        const currentStepMessages: { agentId: string; content: string }[] = [];

        for (let i = 0; i < responding.length; i++) {
          const { agent, score } = responding[i];

          send({
            type: "agent_start",
            agentId: agent.id,
            agentName: agent.name,
            emoji: agent.avatar_emoji,
            color: agent.color,
            stepNumber,
            sequenceInStep: i + 1,
          });

          const { system, messages } = buildAgentMessages(
            agent,
            config.mission,
            workspaceContext,
            toolInsights,
            history,
            agentsMap,
            currentStepMessages
          );

          // Ensure messages is never empty — add user message if needed
          if (messages.length === 0) {
            messages.push({ role: "user", content: userMessage });
          }

          let fullContent = "";

          const result = streamText({
            model: getModelForAgent(sessionModels, i, keys),
            system,
            messages,
            maxOutputTokens: 1000,
          });

          for await (const delta of result.textStream) {
            fullContent += delta;
            send({ type: "agent_delta", agentId: agent.id, delta });
          }

          // Persist agent message
          const saved = await insertMessage({
            session_id: sessionId,
            agent_config_id: agent.id,
            role: "agent",
            content: fullContent,
            step_number: stepNumber,
            sequence_in_step: i + 1,
            metadata: { engagement_score: score },
          });

          send({
            type: "agent_done",
            agentId: agent.id,
            messageId: saved.id,
            fullContent,
          });

          currentStepMessages.push({ agentId: agent.id, content: fullContent });
        }

        await incrementTurn(sessionId, stepNumber);

        send({
          type: "step_done",
          stepNumber,
          respondingCount: responding.length,
        });

        // ── Auto-rounds: agents discuss among themselves ──
        const autoRounds = Math.min(2, config.max_turns - stepNumber - 1);
        for (let round = 0; round < autoRounds; round++) {
          const autoStepNumber = stepNumber + 1 + round;

          // Reload history to include latest messages
          const updatedHistory = await getSessionMessages(sessionId);

          // Pick the last agent message as the trigger for scoring
          const lastAgentMsg = updatedHistory
            .filter((m) => m.role === "agent")
            .sort((a, b) => b.step_number - a.step_number || b.sequence_in_step - a.sequence_in_step)[0];

          if (!lastAgentMsg) break;

          const autoResponding = selectRespondingAgents(
            agents.filter((a) => a.id !== lastAgentMsg.agent_config_id),
            lastAgentMsg.content
          );

          if (autoResponding.length === 0) break;

          const autoStepMessages: { agentId: string; content: string }[] = [];

          for (let i = 0; i < autoResponding.length; i++) {
            const { agent, score } = autoResponding[i];

            send({
              type: "agent_start",
              agentId: agent.id,
              agentName: agent.name,
              emoji: agent.avatar_emoji,
              color: agent.color,
              stepNumber: autoStepNumber,
              sequenceInStep: i + 1,
            });

            const { system: autoSystem, messages: autoMessages } = buildAgentMessages(
              agent,
              config.mission,
              workspaceContext,
              toolInsights,
              updatedHistory,
              agentsMap,
              autoStepMessages
            );

            if (autoMessages.length === 0) {
              autoMessages.push({ role: "user", content: lastAgentMsg.content });
            }

            let autoContent = "";
            const autoResult = streamText({
              model: getModelForAgent(sessionModels, i, keys),
              system: autoSystem,
              messages: autoMessages,
              maxOutputTokens: 1000,
            });

            for await (const delta of autoResult.textStream) {
              autoContent += delta;
              send({ type: "agent_delta", agentId: agent.id, delta });
            }

            const autoSaved = await insertMessage({
              session_id: sessionId,
              agent_config_id: agent.id,
              role: "agent",
              content: autoContent,
              step_number: autoStepNumber,
              sequence_in_step: i + 1,
              metadata: { engagement_score: score, auto_round: true },
            });

            send({
              type: "agent_done",
              agentId: agent.id,
              messageId: autoSaved.id,
              fullContent: autoContent,
            });

            autoStepMessages.push({ agentId: agent.id, content: autoContent });
          }

          await incrementTurn(sessionId, autoStepNumber);

          send({
            type: "step_done",
            stepNumber: autoStepNumber,
            respondingCount: autoResponding.length,
          });
        }
      } catch (error) {
        console.error("Debate run error:", error);
        send({ type: "error", message: "An error occurred during the debate." });
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
