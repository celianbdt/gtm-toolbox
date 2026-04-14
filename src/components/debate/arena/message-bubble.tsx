"use client";

import ReactMarkdown from "react-markdown";
import type { AgentConfig, DebateMessage } from "@/lib/debate/types";

type Props = {
  message: DebateMessage;
  agent?: AgentConfig;
};

export function MessageBubble({ message, agent }: Props) {
  const isHuman = message.role === "user";

  if (isHuman) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%] bg-secondary rounded-2xl rounded-tr-sm px-4 py-3">
          <p className="text-sm text-foreground">{message.content}</p>
        </div>
      </div>
    );
  }

  const score = message.metadata?.engagement_score;

  return (
    <div className="flex gap-3 max-w-[75%]">
      {agent && (
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0 mt-1"
          style={{ backgroundColor: `${agent.color}20`, border: `1.5px solid ${agent.color}` }}
        >
          {agent.avatar_emoji}
        </div>
      )}
      <div className="flex-1">
        {agent && (
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold" style={{ color: agent.color }}>
              {agent.name}
            </span>
            <span className="text-xs text-muted-foreground">{agent.role}</span>
            {score !== undefined && score > 0.6 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: `${agent.color}20`, color: agent.color }}
              >
                engaged
              </span>
            )}
          </div>
        )}
        <div
          className="text-[13px] text-zinc-200 leading-snug pl-3 border-l-2 prose prose-invert prose-sm max-w-none prose-p:my-0.5 prose-headings:my-1 prose-headings:text-sm prose-ul:my-0.5 prose-li:my-0 prose-strong:text-zinc-100"
          style={{ borderColor: agent?.color ?? "#6b7280" }}
        >
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
