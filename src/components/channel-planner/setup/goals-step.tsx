"use client";

import type { GoalsInfo, GrowthStage } from "@/lib/channel-planner/types";
import { GROWTH_STAGE_LABELS } from "@/lib/channel-planner/types";

const TIMELINE_OPTIONS = [
  { value: 3, label: "3 months" },
  { value: 6, label: "6 months" },
  { value: 12, label: "12 months" },
  { value: 18, label: "18 months" },
];

const GROWTH_STAGES: GrowthStage[] = [
  "pre-seed",
  "seed",
  "series-a",
  "series-b-plus",
  "growth",
  "enterprise",
];

type Props = {
  goals: GoalsInfo;
  onChange: (goals: GoalsInfo) => void;
};

export function GoalsStep({ goals, onChange }: Props) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-1">
        Define Your Goals
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Set your revenue target, timeline, and growth stage.
      </p>

      <div className="space-y-5">
        {/* Revenue target */}
        <div>
          <label className="text-sm text-muted-foreground block mb-2">
            Revenue target
          </label>
          <input
            type="text"
            placeholder="e.g. $500K ARR, 100 new customers, $1M pipeline..."
            value={goals.revenue_target}
            onChange={(e) =>
              onChange({ ...goals, revenue_target: e.target.value })
            }
            className="w-full bg-secondary/30 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30"
          />
        </div>

        {/* Timeline */}
        <div>
          <label className="text-sm text-muted-foreground block mb-2">
            Timeline
          </label>
          <div className="grid grid-cols-4 gap-2">
            {TIMELINE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() =>
                  onChange({ ...goals, timeline_months: opt.value })
                }
                className={`py-2 px-3 text-sm rounded-lg border transition-all ${
                  goals.timeline_months === opt.value
                    ? "border-[#8a6e4e]/40 bg-[#8a6e4e]/10 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Growth Stage */}
        <div>
          <label className="text-sm text-muted-foreground block mb-2">
            Growth stage
          </label>
          <div className="grid grid-cols-3 gap-2">
            {GROWTH_STAGES.map((stage) => (
              <button
                key={stage}
                onClick={() => onChange({ ...goals, growth_stage: stage })}
                className={`py-2 px-3 text-sm rounded-lg border transition-all ${
                  goals.growth_stage === stage
                    ? "border-[#8a6e4e]/40 bg-[#8a6e4e]/10 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                }`}
              >
                {GROWTH_STAGE_LABELS[stage]}
              </button>
            ))}
          </div>
        </div>

        {/* Primary Objective */}
        <div>
          <label className="text-sm text-muted-foreground block mb-2">
            Primary objective
          </label>
          <input
            type="text"
            placeholder="e.g. Build scalable acquisition engine, reduce CAC below $200..."
            value={goals.primary_objective}
            onChange={(e) =>
              onChange({ ...goals, primary_objective: e.target.value })
            }
            className="w-full bg-secondary/30 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30"
          />
        </div>
      </div>
    </div>
  );
}
