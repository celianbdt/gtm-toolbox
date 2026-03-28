"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import type { AgentConfig } from "@/lib/debate/types";

type Props = {
  mission: string;
  currentTurn: number;
  maxTurns: number;
  status: "active" | "paused" | "concluded";
  agents: AgentConfig[];
  estimatedCost?: number;
};

export function DebateTopBar({ mission, currentTurn, maxTurns, status, agents, estimatedCost }: Props) {
  return (
    <header className="flex h-12 items-center gap-2 border-b border-zinc-800 px-4 flex-shrink-0">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      {/* Agent emoji stack */}
      <div className="flex -space-x-1.5">
        {agents.slice(0, 4).map((agent) => (
          <div
            key={agent.id}
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs ring-2 ring-zinc-950"
            style={{ backgroundColor: `${agent.color}30`, border: `1.5px solid ${agent.color}` }}
            title={agent.name}
          >
            {agent.avatar_emoji}
          </div>
        ))}
      </div>

      <Separator orientation="vertical" className="h-4" />

      {/* Mission title */}
      <span className="text-sm text-zinc-300 truncate flex-1 max-w-md">{mission}</span>

      <div className="ml-auto flex items-center gap-3">
        {/* Status badge */}
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            status === "active"
              ? "bg-emerald-950 text-emerald-400"
              : status === "concluded"
              ? "bg-zinc-800 text-zinc-500"
              : "bg-amber-950 text-amber-400"
          }`}
        >
          {status}
        </span>

        {/* Turn counter */}
        <span className="text-xs text-zinc-500 tabular-nums">
          {currentTurn}/{maxTurns}
        </span>

        {/* Cost */}
        {estimatedCost != null && estimatedCost > 0 && (
          <span className="text-[10px] text-zinc-600 tabular-nums bg-zinc-800/50 px-2 py-0.5 rounded-full">
            ~${estimatedCost < 0.01 ? "<0.01" : estimatedCost.toFixed(2)}
          </span>
        )}
      </div>
    </header>
  );
}
