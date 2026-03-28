"use client";

import type { AnalysisPhase } from "@/lib/competitive-intel/types";

const PHASES: { key: AnalysisPhase; label: string }[] = [
  { key: "data-processing", label: "Data Processing" },
  { key: "analyst-assessment", label: "Assessments" },
  { key: "debate", label: "Debate" },
  { key: "synthesis", label: "Synthesis" },
];

type Props = {
  currentPhase: AnalysisPhase;
  estimatedCost: number;
};

export function PhaseProgress({ currentPhase, estimatedCost }: Props) {
  const currentIndex = PHASES.findIndex((p) => p.key === currentPhase);
  const isComplete = currentPhase === "complete";

  const costDisplay =
    estimatedCost < 0.01
      ? `<$0.01`
      : `~$${estimatedCost.toFixed(2)}`;

  return (
    <div className="shrink-0 px-6 py-3 border-b border-border">
      <div className="flex items-center gap-1 max-w-2xl mx-auto">
        {PHASES.map((phase, i) => {
          const isActive = i === currentIndex;
          const isDone = i < currentIndex || isComplete;

          return (
            <div key={phase.key} className="flex items-center gap-1.5 flex-1">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors ${
                  isDone
                    ? "bg-[#7C3AED] text-white"
                    : isActive
                    ? "bg-[#7C3AED]/60 text-white animate-pulse"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {isDone ? "\u2713" : i + 1}
              </div>
              <span
                className={`text-[11px] transition-colors whitespace-nowrap ${
                  isActive
                    ? "text-foreground font-medium"
                    : isDone
                    ? "text-[#A78BFA]"
                    : "text-muted-foreground"
                }`}
              >
                {phase.label}
              </span>
              {i < PHASES.length - 1 && (
                <div
                  className={`flex-1 h-px transition-colors ${
                    isDone ? "bg-[#7C3AED]" : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}

        {/* Cost badge */}
        {estimatedCost > 0 && (
          <span className="ml-2 text-[10px] text-muted-foreground tabular-nums bg-secondary/50 px-2 py-0.5 rounded-full">
            {costDisplay}
          </span>
        )}
      </div>
    </div>
  );
}
