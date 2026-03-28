"use client";

import { useState, useCallback, useRef } from "react";
import type { AgentConfig, SSEEvent } from "@/lib/debate/types";

export type StreamingAgent = {
  agent: AgentConfig;
  accumulated: string;
};

const COST_PER_CHAR_OUTPUT = 0.0000038;

export function useDebateStream() {
  const [streamingAgents, setStreamingAgents] = useState<Map<string, StreamingAgent>>(new Map());
  const [isStreaming, setIsStreaming] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setStreamingAgents(new Map());
  }, []);

  const sendMessage = useCallback(
    async (
      sessionId: string,
      userMessage: string,
      workspaceId: string,
      onAgentDone: (agentId: string, messageId: string, fullContent: string, stepNumber: number, sequenceInStep: number) => void,
      onStepDone: (stepNumber: number) => void
    ) => {
      setIsStreaming(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch("/api/debate/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, userMessage, workspaceId }),
          signal: controller.signal,
        });

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          if (controller.signal.aborted) break;

          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const line = part.replace(/^data: /, "").trim();
            if (!line) continue;

            let event: SSEEvent;
            try {
              event = JSON.parse(line);
            } catch {
              continue;
            }

            if (event.type === "agent_start") {
              const agent: AgentConfig = {
                id: event.agentId,
                name: event.agentName,
                avatar_emoji: event.emoji,
                color: event.color,
                workspace_id: null,
                slug: "",
                role: "",
                personality: { traits: {}, speaking_style: "", biases: [], trigger_topics: [] },
                system_prompt: "",
                engagement_weights: { contradiction: 0, new_data: 0, customer_mention: 0, strategy_shift: 0 },
                is_template: false,
              };
              setStreamingAgents((prev) => {
                const next = new Map(prev);
                next.set(event.agentId, { agent, accumulated: "" });
                return next;
              });
            } else if (event.type === "agent_delta") {
              setStreamingAgents((prev) => {
                const next = new Map(prev);
                const existing = next.get(event.agentId);
                if (existing) {
                  next.set(event.agentId, {
                    ...existing,
                    accumulated: existing.accumulated + event.delta,
                  });
                }
                return next;
              });
              // Track cost
              setEstimatedCost((prev) => prev + (event.delta?.length ?? 0) * COST_PER_CHAR_OUTPUT);
            } else if (event.type === "agent_done") {
              setStreamingAgents((prev) => {
                const next = new Map(prev);
                next.delete(event.agentId);
                return next;
              });
              onAgentDone(event.agentId, event.messageId, event.fullContent, 0, 0);
            } else if (event.type === "step_done") {
              onStepDone(event.stepNumber);
            }
          }
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          return;
        }
        throw e;
      } finally {
        setIsStreaming(false);
        setStreamingAgents(new Map());
      }
    },
    []
  );

  return { streamingAgents, isStreaming, sendMessage, abort, estimatedCost };
}
