"use client";

import type { AgentConfig } from "@/lib/debate/types";

type Props = {
  agent: AgentConfig;
  onRemove?: () => void;
  compact?: boolean;
  selected?: boolean;
  onClick?: () => void;
};

export function AgentCard({ agent, onRemove, compact = false, selected = false, onClick }: Props) {
  if (compact) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm"
        style={{ borderColor: agent.color, backgroundColor: `${agent.color}15` }}
      >
        <span>{agent.avatar_emoji}</span>
        <span className="font-medium" style={{ color: agent.color }}>
          {agent.name}
        </span>
        {onRemove && (
          <button
            onClick={onRemove}
            className="ml-1 text-zinc-400 hover:text-white transition-colors"
          >
            ×
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-xl border p-4 transition-all cursor-pointer ${
        selected ? "ring-2" : "hover:border-zinc-500"
      }`}
      style={{
        borderColor: selected ? agent.color : undefined,
        outlineColor: selected ? agent.color : undefined,
        backgroundColor: selected ? `${agent.color}10` : undefined,
      }}
      onClick={onClick}
    >
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs flex items-center justify-center transition-colors"
        >
          ×
        </button>
      )}

      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: `${agent.color}25`, border: `2px solid ${agent.color}` }}
        >
          {agent.avatar_emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm text-white">{agent.name}</div>
          <div className="text-xs text-zinc-400 mt-0.5">{agent.role}</div>
          {agent.personality?.speaking_style && (
            <div className="text-xs text-zinc-500 mt-2 line-clamp-2">
              {agent.personality.speaking_style}
            </div>
          )}
        </div>
      </div>

      {/* Engagement weight bars */}
      {agent.engagement_weights && (
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {Object.entries(agent.engagement_weights).map(([key, value]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="text-[10px] text-zinc-500 w-16 truncate capitalize">
                {key.replace("_", " ")}
              </div>
              <div className="flex-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(value as number) * 100}%`, backgroundColor: agent.color }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
