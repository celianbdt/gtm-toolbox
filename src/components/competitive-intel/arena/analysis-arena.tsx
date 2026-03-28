"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { AnalysisPhase } from "@/lib/competitive-intel/types";
import { PhaseProgress } from "./phase-progress";
import { AnalystFeed } from "./analyst-feed";
import { SteeringInput } from "./steering-input";

type StreamingAgent = {
  agentId: string;
  agentName: string;
  emoji: string;
  color: string;
  content: string;
  phase: AnalysisPhase;
};

export type ArenaMessage = {
  id: string;
  agentId: string;
  agentName: string;
  emoji: string;
  color: string;
  content: string;
  phase: AnalysisPhase;
  role: "agent" | "user";
};

type Props = {
  sessionId: string;
  onComplete: () => void;
  onSaveExit: () => void;
};

// Cost estimation: Sonnet 4.5 output ~$15/1M tokens, ~4 chars per token
const COST_PER_CHAR_OUTPUT = 0.0000038; // $0.0000038 per char
const COST_PER_CHAR_INPUT = 0.00000075; // ~$3/1M tokens input

export function AnalysisArena({ sessionId, onComplete, onSaveExit }: Props) {
  const [currentPhase, setCurrentPhase] = useState<AnalysisPhase>("data-processing");
  const [messages, setMessages] = useState<ArenaMessage[]>([]);
  const [streamingAgents, setStreamingAgents] = useState<Map<string, StreamingAgent>>(new Map());
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState("");
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [totalChars, setTotalChars] = useState(0);

  const hasStarted = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const pauseResolveRef = useRef<(() => void) | null>(null);

  const handlePause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const handleResume = useCallback(() => {
    setIsPaused(false);
    if (pauseResolveRef.current) {
      pauseResolveRef.current();
      pauseResolveRef.current = null;
    }
  }, []);

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsRunning(false);
    setIsPaused(false);
    // Data is already persisted in DB — just navigate to deliverables
    setTimeout(() => onSaveExit(), 500);
  }, [onSaveExit]);

  const handleSaveExit = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsRunning(false);
    setIsPaused(false);
    onSaveExit();
  }, [onSaveExit]);

  const handleUserMessage = useCallback((text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        agentId: "user",
        agentName: "You",
        emoji: "",
        color: "#7C3AED",
        content: text,
        phase: "debate",
        role: "user",
      },
    ]);
  }, []);

  const startAnalysis = useCallback(async () => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    setIsRunning(true);
    setError("");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch("/api/competitive-intel/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error("Failed to start analysis");
      }

      const reader = res.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        // Pause support: wait if paused
        if (isPaused) {
          await new Promise<void>((resolve) => {
            pauseResolveRef.current = resolve;
          });
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          try {
            const event = JSON.parse(raw);

            switch (event.type) {
              case "phase_start":
                setCurrentPhase(event.phase);
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
                  const next = new Map(prev);
                  const agent = next.get(event.agentId);
                  if (agent) {
                    next.set(event.agentId, {
                      ...agent,
                      content: agent.content + event.delta,
                    });
                  }
                  return next;
                });
                // Track cost
                setTotalChars((prev) => prev + event.delta.length);
                setEstimatedCost((prev) => prev + event.delta.length * COST_PER_CHAR_OUTPUT);
                break;
              case "agent_done":
                setStreamingAgents((prev) => {
                  const next = new Map(prev);
                  const agent = next.get(event.agentId);
                  next.delete(event.agentId);
                  if (agent) {
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: event.messageId,
                        agentId: agent.agentId,
                        agentName: agent.agentName,
                        emoji: agent.emoji,
                        color: agent.color,
                        content: event.fullContent,
                        phase: agent.phase,
                        role: "agent" as const,
                      },
                    ]);
                  }
                  return next;
                });
                break;
              case "phase_done":
                break;
              case "analysis_complete":
                setIsRunning(false);
                setCurrentPhase("complete");
                setTimeout(() => onComplete(), 1500);
                break;
              case "error":
                setError(event.message);
                setIsRunning(false);
                break;
            }
          } catch {
            // skip malformed events
          }
        }
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        // User aborted — this is expected
        return;
      }
      setError(e instanceof Error ? e.message : "Analysis failed");
      setIsRunning(false);
    }
  }, [sessionId, onComplete, isPaused]);

  useEffect(() => {
    startAnalysis();
  }, [startAnalysis]);

  // Pause state needs to trigger resume when changed
  useEffect(() => {
    if (!isPaused && pauseResolveRef.current) {
      pauseResolveRef.current();
      pauseResolveRef.current = null;
    }
  }, [isPaused]);

  const showInput = isRunning && currentPhase !== "data-processing" && currentPhase !== "synthesis";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0">
        <PhaseProgress currentPhase={currentPhase} estimatedCost={estimatedCost} />
      </div>

      {/* Scrollable feed area — only this scrolls */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <AnalystFeed
            messages={messages}
            streamingAgents={streamingAgents}
          />
        </div>
      </div>

      {/* Paused overlay */}
      {isPaused && (
        <div className="px-6 py-4 border-t border-border bg-secondary/50">
          <div className="max-w-3xl mx-auto flex items-center justify-center gap-3">
            <span className="text-sm text-muted-foreground">Analysis paused</span>
            <button
              onClick={handleResume}
              className="px-3 py-1.5 text-xs bg-[#7C3AED] text-white rounded-lg hover:bg-[#6D28D9] transition-colors"
            >
              Resume
            </button>
            <button
              onClick={handleSaveExit}
              className="px-3 py-1.5 text-xs bg-secondary text-foreground rounded-lg hover:bg-accent transition-colors"
            >
              Save & Exit
            </button>
            <button
              onClick={handleStop}
              className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Stop
            </button>
          </div>
        </div>
      )}

      {/* Sticky bottom bar — always visible */}
      <div className="shrink-0">
        {!isPaused && isRunning && (
          <SteeringInput
            onSend={handleUserMessage}
            onPause={handlePause}
            onStop={handleStop}
            isRunning={isRunning}
          />
        )}

        {!isRunning && !error && currentPhase === "complete" && (
          <div className="px-6 py-4 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Analysis complete. Loading deliverables...
            </p>
          </div>
        )}

        {!isRunning && error && (
          <div className="px-6 py-3 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Analysis stopped.{" "}
              <button onClick={onSaveExit} className="text-[#A78BFA] hover:underline">
                View partial results
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
