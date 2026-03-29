"use client";

import type { CPSessionOutput } from "@/lib/channel-planner/types";
import type { BudgetAllocationOutput } from "@/lib/channel-planner/schemas";

type Props = { output: CPSessionOutput };

const DIRECTION_COLORS: Record<string, string> = {
  increase: "text-green-400",
  maintain: "text-yellow-400",
  decrease: "text-orange-400",
  new: "text-blue-400",
  cut: "text-red-400",
};

const DIRECTION_ICONS: Record<string, string> = {
  increase: "\u2191",
  maintain: "\u2192",
  decrease: "\u2193",
  new: "+",
  cut: "\u2717",
};

export function BudgetAllocationView({ output }: Props) {
  const data = output.metadata as unknown as BudgetAllocationOutput;

  return (
    <div className="space-y-6">
      {/* Total budget */}
      <div className="border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Budget Allocation
          </h3>
          <span className="text-sm font-semibold text-foreground">
            ${data.total_budget.toLocaleString()}/mo
          </span>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed">
          {data.reallocation_summary}
        </p>
      </div>

      {/* Allocation bars */}
      <div className="space-y-3">
        {data.allocations.map((alloc, i) => (
          <div key={i} className="border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-medium ${
                    DIRECTION_COLORS[alloc.change_direction] ?? "text-muted-foreground"
                  }`}
                >
                  {DIRECTION_ICONS[alloc.change_direction] ?? ""}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {alloc.channel}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    DIRECTION_COLORS[alloc.change_direction] ?? "text-muted-foreground"
                  } bg-secondary`}
                >
                  {alloc.change_direction}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                {alloc.current_spend !== undefined && alloc.current_spend > 0 && (
                  <span className="text-xs text-muted-foreground line-through">
                    ${alloc.current_spend.toLocaleString()}
                  </span>
                )}
                <span className="font-semibold text-foreground">
                  ${alloc.recommended_spend.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {alloc.percentage.toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Percentage bar */}
            <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-[#7C3AED] rounded-full transition-all"
                style={{ width: `${Math.min(alloc.percentage, 100)}%` }}
              />
            </div>

            <p className="text-xs text-foreground/70">{alloc.rationale}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
