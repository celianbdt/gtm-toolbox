"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { OBSSEEvent } from "@/lib/outbound-builder/types";
import { PixelArenaWrapper } from "@/components/shared/pixel-arena-wrapper";

type StreamingAgent = {
  agentId: string;
  agentName: string;
  emoji: string;
  color: string;
  content: string;
  phase: string;
};

type ArenaMessage = {
  id: string;
  agentId: string;
  agentName: string;
  emoji: string;
  color: string;
  content: string;
  phase: string;
  role: "agent";
};

type Props = {
  sessionId: string;
  mode: "analyzer" | "builder";
  onComplete: () => void;
};

const COST_PER_CHAR = 0.0000038;

export function OutboundArena({ sessionId, mode, onComplete }: Props) {
  const [currentPhase, setCurrentPhase] = useState("");
  const [phaseNumber, setPhaseNumber] = useState(0);
  const [messages, setMessages] = useState<ArenaMessage[]>([]);
  const [streamingAgents, setStreamingAgents] = useState<Map<string, StreamingAgent>>(new Map());
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState("");
  const [estimatedCost, setEstimatedCost] = useState(0);

  const hasStarted = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const runEndpoint = mode === "analyzer" ? "/api/outbound-builder/run" : "/api/outbound-builder/build";

  const startStream = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setError("");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch(runEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        setError("Failed to start analysis");
        setIsRunning(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          try {
            const event: OBSSEEvent = JSON.parse(trimmed.slice(6));
            handleEvent(event);
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError("Stream interrupted");
      }
    } finally {
      setIsRunning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, runEndpoint, isRunning]);

  function handleEvent(event: OBSSEEvent) {
    switch (event.type) {
      case "phase_start":
        setCurrentPhase(event.phase);
        setPhaseNumber(event.phaseNumber);
        break;

      case "agent_start":
        setStreamingAgents((prev) => {
          const next = new Map(prev);
          next.set(event.agentId, {
            agentId: event.agentId,
            agentName: event.agentName,
            emoji: event.emoji,
            color: event.color,
            content: "",
            phase: event.phase,
          });
          return next;
        });
        break;

      case "agent_delta":
        setStreamingAgents((prev) => {
          const agent = prev.get(event.agentId);
          if (!agent) return prev;
          const next = new Map(prev);
          next.set(event.agentId, { ...agent, content: agent.content + event.delta });
          return next;
        });
        setEstimatedCost((prev) => prev + event.delta.length * COST_PER_CHAR);
        break;

      case "agent_done": {
        const streaming = streamingAgents.get(event.agentId);
        if (streaming) {
          setMessages((prev) => [
            ...prev,
            {
              id: event.messageId,
              agentId: event.agentId,
              agentName: streaming.agentName,
              emoji: streaming.emoji,
              color: streaming.color,
              content: event.fullContent,
              phase: streaming.phase,
              role: "agent",
            },
          ]);
        }
        setStreamingAgents((prev) => {
          const next = new Map(prev);
          next.delete(event.agentId);
          return next;
        });
        break;
      }

      case "analysis_complete":
        onComplete();
        break;

      case "error":
        setError(event.message);
        break;
    }
  }

  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      startStream();
    }
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [startStream]);

  // Auto-scroll
  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, streamingAgents.size]);

  const handleStop = () => {
    abortControllerRef.current?.abort();
  };

  const totalPhases = mode === "analyzer" ? 4 : 3;
  const phaseLabels: Record<string, string> = {
    "data-processing": "Data Processing",
    "analyst-assessment": "Analyst Assessment",
    debate: "Cross-Analyst Debate",
    synthesis: "Synthesis",
    "context-loading": "Loading Context",
    "strategy-generation": "Strategy Debate",
    "sequence-drafting": "Generating Sequences",
  };

  const pixelAgents: { id: string; name: string; emoji: string; color: string; role: string }[] = [];
  const seenIds = new Set<string>();
  for (const s of streamingAgents.values()) {
    if (!seenIds.has(s.agentId)) {
      pixelAgents.push({ id: s.agentId, name: s.agentName, emoji: s.emoji, color: s.color, role: s.phase });
      seenIds.add(s.agentId);
    }
  }
  for (const m of messages) {
    if (!seenIds.has(m.agentId)) {
      pixelAgents.push({ id: m.agentId, name: m.agentName, emoji: m.emoji, color: m.color, role: m.phase });
      seenIds.add(m.agentId);
    }
  }
  const pixelSpeakingId = streamingAgents.size > 0 ? [...streamingAgents.keys()][0] : null;
  const pixelStreamingText = pixelSpeakingId ? streamingAgents.get(pixelSpeakingId)?.content ?? "" : "";

  return (
    <PixelArenaWrapper
      agents={pixelAgents}
      speakingId={pixelSpeakingId}
      thinkingId={null}
      streamingText={pixelStreamingText}
      theme="outbound"
    >
    <div className="flex flex-col h-full">
      {/* Phase indicator */}
      <div className="px-6 py-3 border-b border-border bg-secondary/30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isRunning && (
              <div className="w-3 h-3 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
            )}
            <div>
              <span className="text-sm font-medium text-foreground">
                Phase {phaseNumber}/{totalPhases}: {phaseLabels[currentPhase] ?? currentPhase}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">
              ~${estimatedCost.toFixed(4)}
            </span>
            {isRunning && (
              <button
                onClick={handleStop}
                className="px-3 py-1.5 text-xs bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                Stop
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Message feed */}
      <div ref={feedRef} className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 mt-0.5"
                style={{ backgroundColor: `${msg.color}20`, border: `1.5px solid ${msg.color}` }}
              >
                {msg.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">{msg.agentName}</span>
                  <span className="text-[10px] text-muted-foreground">{phaseLabels[msg.phase] ?? msg.phase}</span>
                </div>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}

          {/* Streaming agents */}
          {[...streamingAgents.values()].map((agent) => (
            <div key={agent.agentId} className="flex gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 mt-0.5"
                style={{ backgroundColor: `${agent.color}20`, border: `1.5px solid ${agent.color}` }}
              >
                {agent.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">{agent.agentName}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-pulse" />
                </div>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {agent.content}
                  <span className="inline-block w-1 h-4 bg-[#7C3AED] animate-pulse ml-0.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="px-6 py-3 border-t border-border bg-red-500/5">
          <p className="text-sm text-red-400 text-center">{error}</p>
        </div>
      )}
    </div>
    </PixelArenaWrapper>
  );
}
