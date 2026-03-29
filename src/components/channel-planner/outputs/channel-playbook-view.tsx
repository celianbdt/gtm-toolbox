"use client";

import type { CPSessionOutput } from "@/lib/channel-planner/types";
import type { ChannelPlaybook } from "@/lib/channel-planner/schemas";

type Props = { output: CPSessionOutput };

const PRIORITY_COLORS: Record<string, string> = {
  p0: "text-red-400 bg-red-400/10",
  p1: "text-orange-400 bg-orange-400/10",
  p2: "text-yellow-400 bg-yellow-400/10",
};

export function ChannelPlaybookView({ output }: Props) {
  const data = output.metadata as unknown as ChannelPlaybook;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-base font-semibold text-foreground">
          {data.channel_name}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">{data.objective}</p>
      </div>

      {/* Tactics */}
      <div className="px-5 py-4 border-b border-border">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Tactics
        </h4>
        <div className="space-y-3">
          {data.tactics.map((t, i) => (
            <div key={i} className="flex gap-3">
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${
                  PRIORITY_COLORS[t.priority] ?? ""
                }`}
              >
                {t.priority.toUpperCase()}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {t.tactic}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t.description}
                </p>
                <div className="flex gap-4 mt-1.5">
                  <span className="text-[10px] text-muted-foreground">
                    Cost: {t.estimated_cost}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Expected: {t.expected_outcome}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="px-5 py-4 border-b border-border">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          KPIs
        </h4>
        <div className="space-y-2">
          {data.kpis.map((kpi, i) => (
            <div key={i} className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block mb-0.5">
                  Metric
                </span>
                <span className="text-foreground font-medium">{kpi.metric}</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">
                  Target
                </span>
                <span className="text-foreground">{kpi.target}</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">
                  Measurement
                </span>
                <span className="text-foreground">{kpi.measurement}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Wins & Risks */}
      <div className="px-5 py-4 grid grid-cols-2 gap-5">
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Quick Wins
          </h4>
          <ul className="space-y-1">
            {data.quick_wins.map((w, i) => (
              <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                <span className="text-green-400 shrink-0 mt-1">&#8226;</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Risks
          </h4>
          <ul className="space-y-1">
            {data.risks.map((r, i) => (
              <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                <span className="text-red-400 shrink-0 mt-1">&#8226;</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
