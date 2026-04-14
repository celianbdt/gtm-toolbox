"use client";

import { useState, useEffect, useCallback } from "react";
import type { AgentConfig, DebateMessage, DebateSession } from "@/lib/debate/types";
import { useDebateStream } from "@/hooks/use-debate-stream";
import { DebateTopBar } from "./debate-top-bar";
import { MessageFeed } from "./message-feed";
import { HumanInput } from "./human-input";
import { PixelArenaWrapper } from "@/components/shared/pixel-arena-wrapper";

type Props = {
  sessionId: string;
  workspaceId: string;
  onConcluded?: (sessionId: string) => void;
};

export function DebateArena({ sessionId, workspaceId, onConcluded }: Props) {
  const [session, setSession] = useState<DebateSession | null>(null);
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [agentsMap, setAgentsMap] = useState<Map<string, AgentConfig>>(new Map());
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isConcluded, setIsConcluded] = useState(false);

  const { streamingAgents, isStreaming, sendMessage, abort, estimatedCost } = useDebateStream();

  const synthesizeDebate = useCallback(async () => {
    setIsSynthesizing(true);
    try {
      await fetch("/api/debate/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      setIsConcluded(true);
    } catch (e) {
      console.error("Failed to synthesize debate:", e);
    } finally {
      setIsSynthesizing(false);
    }
  }, [sessionId]);

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
          setMessages((prev) =>
            prev.some((m) => m.id === messageId) ? prev : [...prev, msg]
          );
        },
        (stepNumber) => {
          const nextTurn = stepNumber + 1;
          setCurrentTurn(nextTurn);
          // Auto-synthesize when max turns reached
          if (session && nextTurn >= session.config.max_turns) {
            synthesizeDebate();
          }
        }
      );
    },
    [sessionId, workspaceId, currentTurn, agentsMap, sendMessage, session, synthesizeDebate]
  );

  const handlePause = useCallback(() => {
    abort();
  }, [abort]);

  const handleStop = useCallback(() => {
    abort();
    synthesizeDebate();
  }, [abort, synthesizeDebate]);

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

  const pixelSpeakingId = streamingAgents.size > 0 ? [...streamingAgents.keys()][0] : null;
  const pixelStreamingText = pixelSpeakingId ? streamingAgents.get(pixelSpeakingId)?.accumulated ?? "" : "";

  return (
    <PixelArenaWrapper
      agents={agents.map((a) => ({ id: a.id, name: a.name, emoji: a.avatar_emoji, color: a.color, role: a.role }))}
      speakingId={pixelSpeakingId}
      thinkingId={null}
      streamingText={pixelStreamingText}
      theme="strategy"
    >
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
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

      {/* Synthesis overlay */}
      {isSynthesizing && (
        <div className="px-6 py-4 border-t border-border bg-secondary/50">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-3">
            <div className="w-4 h-4 border-2 border-[#8a6e4e] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Synthesizing debate insights...</span>
          </div>
        </div>
      )}

      {isConcluded && (
        <div className="px-6 py-4 border-t border-border bg-secondary/50">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-3">
            <span className="text-sm text-muted-foreground">Debate concluded — insights saved for cross-tool use</span>
            {onConcluded && (
              <button
                onClick={() => onConcluded(sessionId)}
                className="px-4 py-1.5 text-xs text-white bg-[#8a6e4e] hover:bg-[#6D28D9] rounded-lg transition-colors"
              >
                View deliverables
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sticky input */}
      {!isConcluded && !isSynthesizing && (
        <HumanInput
          onSend={handleSend}
          onPause={handlePause}
          onStop={handleStop}
          isStreaming={isStreaming}
          currentTurn={currentTurn}
          maxTurns={maxTurns}
        />
      )}
    </div>
    </PixelArenaWrapper>
  );
}
