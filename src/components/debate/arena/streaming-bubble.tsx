"use client";

import type { AgentConfig } from "@/lib/debate/types";

type Props = {
  agent: AgentConfig;
  content: string;
};

export function StreamingBubble({ agent, content }: Props) {
  return (
    <div className="flex gap-3 max-w-[85%]">
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
          <span className="text-xs text-zinc-600">{agent.role}</span>
          {!content && (
            <span className="text-xs text-zinc-500 italic">thinking...</span>
          )}
        </div>
        <div
          className="text-sm text-zinc-200 leading-relaxed pl-3 border-l-2"
          style={{ borderColor: agent.color }}
        >
          {content ? (
            <>
              {content.split("\n").map((line, i) => (
                <p key={i} className={i > 0 ? "mt-2" : ""}>
                  {line}
                </p>
              ))}
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
