"use client";

import ReactMarkdown from "react-markdown";
import type { AgentConfig } from "@/lib/debate/types";

type Props = {
  agent: AgentConfig;
  content: string;
};

export function StreamingBubble({ agent, content }: Props) {
  return (
    <div className="flex gap-3 max-w-[75%]">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0 mt-1 animate-pulse"
        style={{ backgroundColor: `${agent.color}20`, border: `1.5px solid ${agent.color}` }}
      >
        {agent.avatar_emoji}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-semibold" style={{ color: agent.color }}>
            {agent.name}
          </span>
          <span className="text-xs text-muted-foreground">{agent.role}</span>
          {!content && (
            <span className="text-xs text-muted-foreground italic">thinking...</span>
          )}
        </div>
        <div
          className="text-[13px] text-zinc-200 leading-snug pl-3 border-l-2 prose prose-invert prose-sm max-w-none prose-p:my-0.5 prose-headings:my-1 prose-headings:text-sm prose-ul:my-0.5 prose-li:my-0 prose-strong:text-zinc-100"
          style={{ borderColor: agent.color }}
        >
          {content ? (
            <>
              <ReactMarkdown>{content}</ReactMarkdown>
              <span className="inline-block w-0.5 h-4 bg-current ml-0.5 animate-pulse" />
            </>
          ) : (
            <div className="flex gap-1 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
