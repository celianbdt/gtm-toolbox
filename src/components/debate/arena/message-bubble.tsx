"use client";

import type { AgentConfig, DebateMessage } from "@/lib/debate/types";

type Props = {
  message: DebateMessage;
  agent?: AgentConfig;
};

function renderContent(content: string) {
  return content.split("\n").map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className={i > 0 ? "mt-2" : ""}>
        {parts.map((part, j) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={j}>{part.slice(2, -2)}</strong>
          ) : (
            part
          )
        )}
      </p>
    );
  });
}

export function MessageBubble({ message, agent }: Props) {
  const isHuman = message.role === "user";

  if (isHuman) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%] bg-zinc-800 rounded-2xl rounded-tr-sm px-4 py-3">
          <p className="text-sm text-white">{message.content}</p>
        </div>
      </div>
    );
  }

  const score = message.metadata?.engagement_score;

  return (
    <div className="flex gap-3 max-w-[85%]">
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
            <span className="text-xs text-zinc-600">{agent.role}</span>
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
          className="text-sm text-zinc-200 leading-relaxed pl-3 border-l-2"
          style={{ borderColor: agent?.color ?? "#6b7280" }}
        >
          {renderContent(message.content)}
        </div>
      </div>
    </div>
  );
}
