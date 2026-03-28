import { NextRequest } from "next/server";
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  getSession,
  getAgentsByIds,
  getSessionMessages,
  getWorkspaceContext,
  insertMessage,
  incrementTurn,
} from "@/lib/debate/db";
import { selectRespondingAgents } from "@/lib/debate/scoring";
import type { SSEEvent, AgentConfig, DebateMessage } from "@/lib/debate/types";

function encodeSSE(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function buildAgentMessages(
  agent: AgentConfig,
  mission: string,
  workspaceContext: string,
  history: DebateMessage[],
  agentsMap: Map<string, AgentConfig>,
  currentStepMessages: { agentId: string; content: string }[]
) {
  const contextBlock = workspaceContext
    ? `\n\n## Company Context\n${workspaceContext}`
    : "";

  const systemPrompt = `${agent.system_prompt}${contextBlock}

## Debate Mission
${mission}

## Debate Rules
- You are participating in a strategic debate with other AI agents.
- Be direct, opinionated, and stay true to your personality.
- Reference what others have said when relevant — agree, disagree, or build on it.
- Keep responses focused and under 200 words unless making a critical point.
- Never break character. Never say you are an AI.`;

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
        const history = await getSessionMessages(sessionId);

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
            history,
            agentsMap,
            currentStepMessages
          );

          let fullContent = "";

          const result = streamText({
            model: anthropic("claude-sonnet-4-5"),
            system,
            messages,
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
