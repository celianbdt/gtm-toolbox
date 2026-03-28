"use client";

import { useState, useEffect, useCallback } from "react";
import type { AgentConfig, DebateMessage, DebateSession } from "@/lib/debate/types";
import { useDebateStream } from "@/hooks/use-debate-stream";
import { DebateTopBar } from "./debate-top-bar";
import { MessageFeed } from "./message-feed";
import { HumanInput } from "./human-input";

type Props = {
  sessionId: string;
  workspaceId: string;
};

export function DebateArena({ sessionId, workspaceId }: Props) {
  const [session, setSession] = useState<DebateSession | null>(null);
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [agentsMap, setAgentsMap] = useState<Map<string, AgentConfig>>(new Map());
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const { streamingAgents, isStreaming, sendMessage, abort, estimatedCost } = useDebateStream();

  // Load session + agents + messages
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [sessionRes, msgsRes] = await Promise.all([
          fetch(`/api/debate/session/${sessionId}`),
          fetch(`/api/debate/messages/${sessionId}`),
        ]);
        if (cancelled) return;

        if (sessionRes.ok) {
          const { session: s, agents: a } = await sessionRes.json();
          setSession(s);
          setAgents(a);
          setAgentsMap(new Map(a.map((ag: AgentConfig) => [ag.id, ag])));
          setCurrentTurn(s.config.current_turn);
        }
        if (msgsRes.ok) {
          const { messages: m } = await msgsRes.json();
          setMessages(m);
        }
      } catch (e) {
        console.error("Failed to load session:", e);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [sessionId]);

  const handleSend = useCallback(
    async (userMessage: string) => {
      // Optimistic human message
      const optimisticMsg: DebateMessage = {
        id: `opt-${Date.now()}`,
        session_id: sessionId,
        agent_config_id: null,
        role: "user",
        content: userMessage,
        step_number: currentTurn,
        sequence_in_step: 0,
        metadata: {},
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      await sendMessage(
        sessionId,
        userMessage,
        workspaceId,
        (agentId, messageId, fullContent, stepNumber, sequenceInStep) => {
          const agent = agentsMap.get(agentId);
          if (!agent) return;
          const msg: DebateMessage = {
            id: messageId,
            session_id: sessionId,
            agent_config_id: agentId,
            role: "agent",
            content: fullContent,
            step_number: currentTurn,
            sequence_in_step: sequenceInStep,
            metadata: {},
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, msg]);
        },
        (stepNumber) => {
          setCurrentTurn(stepNumber + 1);
        }
      );
    },
    [sessionId, workspaceId, currentTurn, agentsMap, sendMessage]
  );

  const handlePause = useCallback(() => {
    setIsPaused(true);
    abort();
  }, [abort]);

  const handleStop = useCallback(() => {
    abort();
  }, [abort]);

  const handleResume = useCallback(() => {
    setIsPaused(false);
  }, []);

  if (!session) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          Loading debate...
        </div>
      </div>
    );
  }

  const maxTurns = session.config.max_turns;

  return (
    <div className="flex flex-col h-full">
      <DebateTopBar
        mission={session.config.mission}
        currentTurn={currentTurn}
        maxTurns={maxTurns}
        status={currentTurn >= maxTurns ? "concluded" : isStreaming ? "active" : "active"}
        agents={agents}
        estimatedCost={estimatedCost}
      />

      {/* Scrollable feed */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <MessageFeed
          messages={messages}
          streamingAgents={streamingAgents}
          agentsMap={agentsMap}
        />
      </div>

      {/* Paused overlay */}
      {isPaused && (
        <div className="px-6 py-4 border-t border-border bg-secondary/50">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-3">
            <span className="text-sm text-muted-foreground">Debate paused</span>
            <button
              onClick={handleResume}
              className="px-3 py-1.5 text-xs bg-[#7C3AED] text-white rounded-lg hover:bg-[#6D28D9] transition-colors"
            >
              Resume
            </button>
          </div>
        </div>
      )}

      {/* Sticky input */}
      <HumanInput
        onSend={handleSend}
        onPause={handlePause}
        onStop={handleStop}
        isStreaming={isStreaming}
        currentTurn={currentTurn}
        maxTurns={maxTurns}
      />
    </div>
  );
}
