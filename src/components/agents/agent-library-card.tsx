"use client";

import type { AgentConfig } from "@/lib/debate/types";
import { Copy, Pencil, Trash2 } from "lucide-react";

type Props = {
  agent: AgentConfig;
  isTemplate?: boolean;
  onClone?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

export function AgentLibraryCard({ agent, isTemplate, onClone, onEdit, onDelete }: Props) {
  return (
    <div
      className="relative rounded-xl border border-zinc-800 p-4 transition-colors hover:border-zinc-700 bg-zinc-900/50"
    >
      {/* Badge */}
      {isTemplate && (
        <span className="absolute top-3 right-3 text-[10px] uppercase tracking-wider text-zinc-500 border border-zinc-700 rounded px-1.5 py-0.5">
          Template
        </span>
      )}

      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: `${agent.color}25`, border: `2px solid ${agent.color}` }}
        >
          {agent.avatar_emoji}
        </div>
        <div className="min-w-0 flex-1 pr-14">
          <div className="font-semibold text-sm text-white">{agent.name}</div>
          <div className="text-xs text-zinc-400 mt-0.5">{agent.role}</div>
          {agent.personality?.speaking_style && (
            <div className="text-xs text-zinc-500 mt-2 line-clamp-2">
              {agent.personality.speaking_style}
            </div>
          )}
        </div>
      </div>

      {/* Engagement bars */}
      {agent.engagement_weights && (
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {Object.entries(agent.engagement_weights).map(([key, value]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="text-[10px] text-zinc-500 w-16 truncate capitalize">
                {key.replace("_", " ")}
              </div>
              <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(value as number) * 100}%`, backgroundColor: agent.color }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex gap-1 justify-end">
        {isTemplate && onClone && (
          <button
            onClick={onClone}
            title="Cloner dans ce workspace"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            Cloner
          </button>
        )}
        {!isTemplate && onEdit && (
          <button
            onClick={onEdit}
            title="Modifier"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        {!isTemplate && onDelete && (
          <button
            onClick={onDelete}
            title="Supprimer"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
