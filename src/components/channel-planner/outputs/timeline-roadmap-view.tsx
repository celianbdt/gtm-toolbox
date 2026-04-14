"use client";

import type { CPSessionOutput } from "@/lib/channel-planner/types";
import type { TimelineRoadmap } from "@/lib/channel-planner/schemas";

type Props = { output: CPSessionOutput };

export function TimelineRoadmapView({ output }: Props) {
  const data = output.metadata as unknown as TimelineRoadmap;

  return (
    <div className="space-y-6">
      {/* Phases */}
      <div className="space-y-4">
        {data.phases.map((phase, i) => (
          <div key={i} className="border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-secondary/20">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#8a6e4e] text-white flex items-center justify-center text-xs font-medium">
                  {i + 1}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    {phase.phase_name}
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {phase.duration}
                  </span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {phase.budget_allocation}
              </span>
            </div>

            <div className="px-5 py-4 space-y-3">
              {/* Channels */}
              <div>
                <span className="text-[10px] text-muted-foreground uppercase block mb-1.5">
                  Channels
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {phase.channels.map((ch, j) => (
                    <span
                      key={j}
                      className="text-xs px-2 py-0.5 bg-[#8a6e4e]/10 text-[#c4a882] rounded-full"
                    >
                      {ch}
                    </span>
                  ))}
                </div>
              </div>

              {/* Milestones */}
              <div>
                <span className="text-[10px] text-muted-foreground uppercase block mb-1.5">
                  Milestones
                </span>
                <ul className="space-y-1">
                  {phase.milestones.map((m, j) => (
                    <li key={j} className="text-xs text-foreground/90 flex items-start gap-2">
                      <span className="text-[#c4a882] shrink-0 mt-0.5">&#9670;</span>
                      {m}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Success Criteria */}
              <div>
                <span className="text-[10px] text-muted-foreground uppercase block mb-1">
                  Success Criteria
                </span>
                <p className="text-xs text-foreground/80">{phase.success_criteria}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Critical Path */}
      <div className="border border-border rounded-xl p-5">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Critical Path
        </h3>
        <p className="text-sm text-foreground/90 leading-relaxed">
          {data.critical_path}
        </p>
      </div>
    </div>
  );
}
