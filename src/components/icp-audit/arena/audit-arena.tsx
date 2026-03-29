"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { AuditPhase } from "@/lib/icp-audit/types";
import { ArrowDown, Send, Pause, Square } from "lucide-react";

type StreamingAgent = {
  agentId: string;
  agentName: string;
  emoji: string;
  color: string;
  content: string;
  phase: AuditPhase;
};

type ArenaMessage = {
  id: string;
  agentId: string;
  agentName: string;
  emoji: string;
  color: string;
  content: string;
  phase: AuditPhase;
  role: "agent" | "user";
};

type Props = {
  sessionId: string;
  onComplete: () => void;
  onSaveExit: () => void;
};

const PHASES: { key: AuditPhase; label: string }[] = [
  { key: "data-processing", label: "Data Processing" },
  { key: "analyst-assessment", label: "Assessments" },
  { key: "debate", label: "Debate" },
  { key: "synthesis", label: "Synthesis" },
];

const COST_PER_CHAR_OUTPUT = 0.0000038;

export function AuditArena({ sessionId, onComplete, onSaveExit }: Props) {
  const [currentPhase, setCurrentPhase] = useState<AuditPhase>("data-processing");
  const [messages, setMessages] = useState<ArenaMessage[]>([]);
  const [streamingAgents, setStreamingAgents] = useState<Map<string, StreamingAgent>>(new Map());
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState("");
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [steerInput, setSteerInput] = useState("");

  const hasStarted = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pauseResolveRef = useRef<(() => void) | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const handlePause = useCallback(() => setIsPaused(true), []);

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
      const res = await fetch("/api/icp-audit/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error("Failed to start audit");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
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
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Audit failed");
      setIsRunning(false);
    }
  }, [sessionId, onComplete, isPaused]);

  useEffect(() => {
    startAnalysis();
  }, [startAnalysis]);

  useEffect(() => {
    if (!isPaused && pauseResolveRef.current) {
      pauseResolveRef.current();
      pauseResolveRef.current = null;
    }
  }, [isPaused]);

  // Auto-scroll
  const handleScroll = useCallback(() => {
    const el = feedRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAutoScroll(distanceFromBottom < 60);
  }, []);

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, streamingAgents.size, autoScroll]);

  const allItems = [
    ...messages.map((m) => ({ ...m, streaming: false })),
    ...[...streamingAgents.values()].map((s) => ({
      id: `streaming-${s.phase}-${s.agentId}`,
      ...s,
      streaming: true,
      role: "agent" as const,
    })),
  ];

  const showInput = isRunning && currentPhase !== "data-processing" && currentPhase !== "synthesis";

  // Phase progress
  const currentIndex = PHASES.findIndex((p) => p.key === currentPhase);
  const isComplete = currentPhase === "complete";
  const costDisplay = estimatedCost < 0.01 ? `<$0.01` : `~$${estimatedCost.toFixed(2)}`;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Phase progress */}
      <div className="shrink-0 px-6 py-3 border-b border-border">
        <div className="flex items-center gap-1 max-w-2xl mx-auto">
          {PHASES.map((phase, i) => {
            const isActive = i === currentIndex;
            const isDone = i < currentIndex || isComplete;
            return (
              <div key={phase.key} className="flex items-center gap-1.5 flex-1">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors ${
                    isDone
                      ? "bg-[#7C3AED] text-white"
                      : isActive
                      ? "bg-[#7C3AED]/60 text-white animate-pulse"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {isDone ? "\u2713" : i + 1}
                </div>
                <span
                  className={`text-[11px] transition-colors whitespace-nowrap ${
                    isActive
                      ? "text-foreground font-medium"
                      : isDone
                      ? "text-[#A78BFA]"
                      : "text-muted-foreground"
                  }`}
                >
                  {phase.label}
                </span>
                {i < PHASES.length - 1 && (
                  <div className={`flex-1 h-px transition-colors ${isDone ? "bg-[#7C3AED]" : "bg-border"}`} />
                )}
              </div>
            );
          })}
          {estimatedCost > 0 && (
            <span className="ml-2 text-[10px] text-muted-foreground tabular-nums bg-secondary/50 px-2 py-0.5 rounded-full">
              {costDisplay}
            </span>
          )}
        </div>
      </div>

      {/* Feed */}
      <div ref={feedRef} onScroll={handleScroll} className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-3xl mx-auto px-6 py-4">
          {allItems.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Initializing audit...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {allItems.map((item) => (
                <div key={item.id} className={`flex gap-3 ${item.role === "user" ? "justify-end" : ""}`}>
                  {item.role !== "user" && (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5"
                      style={{ backgroundColor: `${item.color}15`, border: `1px solid ${item.color}40` }}
                    >
                      {item.emoji}
                    </div>
                  )}
                  <div className={`min-w-0 ${item.role === "user" ? "max-w-[80%]" : "flex-1"}`}>
                    {item.role !== "user" && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium" style={{ color: item.color }}>
                          {item.agentName}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase">
                          {item.phase.replace("-", " ")}
                        </span>
                      </div>
                    )}
                    <div
                      className={`text-sm leading-relaxed whitespace-pre-wrap ${
                        item.role === "user"
                          ? "bg-[#7C3AED]/15 text-foreground rounded-xl px-3 py-2 inline-block"
                          : "text-foreground/90"
                      }`}
                    >
                      {item.content}
                      {item.streaming && (
                        <span className="inline-block w-1.5 h-4 bg-[#7C3AED] animate-pulse ml-0.5 align-middle rounded-sm" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      {/* Paused overlay */}
      {isPaused && (
        <div className="px-6 py-4 border-t border-border bg-secondary/50">
          <div className="max-w-3xl mx-auto flex items-center justify-center gap-3">
            <span className="text-sm text-muted-foreground">Audit paused</span>
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

      {/* Bottom bar */}
      <div className="shrink-0">
        {!isPaused && isRunning && showInput && (
          <div className="shrink-0 px-6 py-3 border-t border-border bg-background">
            <div className="max-w-3xl mx-auto flex items-center gap-2">
              <input
                type="text"
                placeholder="Steer the audit..."
                value={steerInput}
                onChange={(e) => setSteerInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && steerInput.trim()) {
                    handleUserMessage(steerInput.trim());
                    setSteerInput("");
                  }
                }}
                className="flex-1 text-sm bg-secondary/30 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/30"
              />
              <button
                onClick={() => {
                  if (steerInput.trim()) {
                    handleUserMessage(steerInput.trim());
                    setSteerInput("");
                  }
                }}
                disabled={!steerInput.trim()}
                className="p-2 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-30 text-white rounded-lg transition-colors"
              >
                <Send className="size-4" />
              </button>
              <button
                onClick={handlePause}
                className="p-2 text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-lg transition-colors"
              >
                <Pause className="size-4" />
              </button>
              <button
                onClick={handleStop}
                className="p-2 text-red-400/70 hover:text-red-400 bg-secondary/50 hover:bg-secondary rounded-lg transition-colors"
              >
                <Square className="size-4" />
              </button>
            </div>
          </div>
        )}

        {!isPaused && isRunning && !showInput && (
          <div className="px-6 py-3 border-t border-border flex items-center justify-center gap-2">
            <button
              onClick={handlePause}
              className="p-2 text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-lg transition-colors"
              title="Pause"
            >
              <Pause className="size-4" />
            </button>
            <button
              onClick={handleStop}
              className="p-2 text-red-400/70 hover:text-red-400 bg-secondary/50 hover:bg-secondary rounded-lg transition-colors"
              title="Stop"
            >
              <Square className="size-4" />
            </button>
          </div>
        )}

        {!isRunning && !error && currentPhase === "complete" && (
          <div className="px-6 py-4 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Audit complete. Loading deliverables...
            </p>
          </div>
        )}

        {!isRunning && error && (
          <div className="px-6 py-3 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Audit stopped.{" "}
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
