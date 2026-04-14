"use client";

import type { CPSessionOutput } from "@/lib/channel-planner/types";
import type { ChannelScorecard } from "@/lib/channel-planner/schemas";

type Props = { output: CPSessionOutput };

const REC_COLORS: Record<string, string> = {
  invest: "text-green-400 bg-green-400/10",
  optimize: "text-blue-400 bg-blue-400/10",
  maintain: "text-yellow-400 bg-yellow-400/10",
  cut: "text-red-400 bg-red-400/10",
  test: "text-purple-400 bg-purple-400/10",
};

export function ChannelScorecardView({ output }: Props) {
  const data = output.metadata as unknown as ChannelScorecard;

  return (
    <div className="space-y-6">
      {/* Overall Assessment */}
      <div className="border border-border rounded-xl p-5">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Overall Assessment
        </h3>
        <p className="text-sm text-foreground/90 leading-relaxed">
          {data.overall_assessment}
        </p>
      </div>

      {/* Channel cards */}
      <div className="space-y-3">
        {data.channels.map((ch, i) => (
          <div key={i} className="border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h4 className="text-sm font-semibold text-foreground">
                  {ch.channel_name}
                </h4>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    REC_COLORS[ch.recommendation] ?? ""
                  }`}
                >
                  {ch.recommendation}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Fit</span>
                <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#8a6e4e] rounded-full"
                    style={{ width: `${ch.fit_score}%` }}
                  />
                </div>
                <span className="text-xs text-foreground tabular-nums">
                  {ch.fit_score}
                </span>
              </div>
            </div>

            <div className="px-5 py-3 grid grid-cols-3 gap-4">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">
                  Cost Efficiency
                </span>
                <span className="text-xs text-foreground">{ch.cost_efficiency}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">
                  Scalability
                </span>
                <span className="text-xs text-foreground">{ch.scalability}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">
                  Time to Impact
                </span>
                <span className="text-xs text-foreground">{ch.time_to_impact}</span>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-border">
              <p className="text-xs text-foreground/80">{ch.rationale}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
