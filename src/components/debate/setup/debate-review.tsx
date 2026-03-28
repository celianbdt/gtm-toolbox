"use client";

import type { AgentConfig } from "@/lib/debate/types";

type Props = {
  agents: AgentConfig[];
  mission: string;
  maxTurns: number;
  insightCount?: number;
};

export function DebateReview({ agents, mission, maxTurns, insightCount = 0 }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Ready to debate</h2>
        <p className="text-sm text-zinc-400 mt-1">Review your setup before starting.</p>
      </div>

      <div className="rounded-xl border border-zinc-800 divide-y divide-zinc-800">
        <div className="p-4">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Mission</div>
          <p className="text-sm text-white">{mission}</p>
        </div>
        <div className="p-4">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">
            Team ({agents.length} agents)
          </div>
          <div className="flex flex-col gap-2">
            {agents.map((a) => (
              <div key={a.id} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
                  style={{ backgroundColor: `${a.color}25`, border: `1.5px solid ${a.color}` }}
                >
                  {a.avatar_emoji}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{a.name}</div>
                  <div className="text-xs text-zinc-500">{a.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Max turns</div>
          <p className="text-sm text-white">{maxTurns} turns</p>
        </div>
        {insightCount > 0 && (
          <div className="p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Cross-tool insights</div>
            <p className="text-sm text-white">
              {insightCount} session{insightCount > 1 ? "s" : ""} included
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-zinc-500">
        You will initiate the debate with your first message. Agents will respond based on their
        engagement with your input. You can interject at any time.
      </p>
    </div>
  );
}
