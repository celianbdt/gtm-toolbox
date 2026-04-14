"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { AgentConfig, DebateMessage } from "@/lib/debate/types";
import type { StreamingAgent } from "@/hooks/use-debate-stream";
import { MessageBubble } from "./message-bubble";
import { StreamingBubble } from "./streaming-bubble";
import { ArrowDown } from "lucide-react";

type Props = {
  messages: DebateMessage[];
  streamingAgents: Map<string, StreamingAgent>;
  agentsMap: Map<string, AgentConfig>;
};

export function MessageFeed({ messages, streamingAgents, agentsMap }: Props) {
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

  // Group by step_number
  const steps = new Map<number, DebateMessage[]>();
  for (const msg of messages) {
    if (!steps.has(msg.step_number)) steps.set(msg.step_number, []);
    steps.get(msg.step_number)!.push(msg);
  }

  const sortedSteps = [...steps.entries()].sort(([a], [b]) => a - b);

  if (messages.length === 0 && streamingAgents.size === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        Start the debate by sending your first message below.
      </div>
    );
  }

  return (
    <div ref={containerRef} onScroll={handleScroll} className="relative px-6 py-6 space-y-8">
      {sortedSteps.map(([stepNumber, stepMsgs]) => {
        const sorted = [...stepMsgs].sort((a, b) => a.sequence_in_step - b.sequence_in_step);
        return (
          <div key={stepNumber} className="space-y-4">
            {stepNumber > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">Turn {stepNumber + 1}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}
            {sorted.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                agent={msg.agent_config_id ? agentsMap.get(msg.agent_config_id) : undefined}
              />
            ))}
          </div>
        );
      })}

      {/* Streaming agents */}
      {streamingAgents.size > 0 && (
        <div className="space-y-4">
          {[...streamingAgents.values()].map(({ agent, accumulated }, i) => (
            <StreamingBubble key={`stream-${agent.id}-${i}`} agent={agent} content={accumulated} />
          ))}
        </div>
      )}

      <div ref={bottomRef} />

      {/* Floating "new content" button */}
      {hasNewContent && !autoScroll && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-[#8a6e4e] text-foreground text-xs rounded-full shadow-lg hover:bg-[#6D28D9] transition-colors"
        >
          <ArrowDown className="size-3" />
          New content
        </button>
      )}
    </div>
  );
}
