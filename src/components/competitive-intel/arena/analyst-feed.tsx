"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { AnalysisPhase } from "@/lib/competitive-intel/types";
import type { ArenaMessage } from "./analysis-arena";
import { ArrowDown } from "lucide-react";

type StreamingAgent = {
  agentId: string;
  agentName: string;
  emoji: string;
  color: string;
  content: string;
  phase: AnalysisPhase;
};

type Props = {
  messages: ArenaMessage[];
  streamingAgents: Map<string, StreamingAgent>;
};

export function AnalystFeed({ messages, streamingAgents }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [hasNewContent, setHasNewContent] = useState(false);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isAtBottom = distanceFromBottom < 60;
    setAutoScroll(isAtBottom);
    if (isAtBottom) setHasNewContent(false);
  }, []);

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      setHasNewContent(true);
    }
  }, [messages.length, streamingAgents.size, autoScroll]);

  function scrollToBottom() {
    setAutoScroll(true);
    setHasNewContent(false);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  // Streaming agents use agentId as Map key, so at most 1 per agent at a time.
  // Use phase + agentId for unique keys since same agent speaks across phases.
  const allItems = [
    ...messages.map((m) => ({ ...m, streaming: false })),
    ...[...streamingAgents.values()].map((s) => ({
      id: `streaming-${s.phase}-${s.agentId}`,
      ...s,
      streaming: true,
      role: "agent" as const,
    })),
  ];

  if (allItems.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#8a6e4e] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Initializing analysis...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} onScroll={handleScroll} className="relative">
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
                    ? "bg-[#8a6e4e]/15 text-foreground rounded-xl px-3 py-2 inline-block"
                    : "text-foreground/90"
                }`}
              >
                {item.content}
                {item.streaming && (
                  <span className="inline-block w-1.5 h-4 bg-[#8a6e4e] animate-pulse ml-0.5 align-middle rounded-sm" />
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Floating "new content" button */}
      {hasNewContent && !autoScroll && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-[#8a6e4e] text-white text-xs rounded-full shadow-lg hover:bg-[#6D28D9] transition-colors"
        >
          <ArrowDown className="size-3" />
          New content
        </button>
      )}
    </div>
  );
}
