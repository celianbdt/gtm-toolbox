"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, DollarSign } from "lucide-react";
import type { CostEstimate } from "@/lib/ai/cost-estimator";

type Props = {
  estimate: CostEstimate;
};

export function CostEstimateBadge({ estimate }: Props) {
  const [expanded, setExpanded] = useState(false);
  const cost = estimate.totalEstimatedCost;

  if (cost === 0) return null;

  const color = cost < 0.05 ? "text-emerald-400" : cost < 0.20 ? "text-amber-400" : "text-orange-400";
  const bgColor = cost < 0.05 ? "bg-emerald-500/10" : cost < 0.20 ? "bg-amber-500/10" : "bg-orange-500/10";

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs ${bgColor} ${color} hover:opacity-80 transition-opacity`}
      >
        <DollarSign className="size-3" />
        <span>~${cost < 0.01 ? "<0.01" : cost.toFixed(2)}</span>
        {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
      </button>

      {expanded && (
        <div className="rounded-md border border-border bg-card p-2 space-y-1">
          {estimate.breakdown.map((b, i) => (
            <div key={i} className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{b.phase} ({b.model})</span>
              <span>${b.cost < 0.001 ? "<0.001" : b.cost.toFixed(4)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
