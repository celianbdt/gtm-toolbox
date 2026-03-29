"use client";

import type { CPSessionOutput } from "@/lib/channel-planner/types";
import type { ROIProjections } from "@/lib/channel-planner/schemas";

type Props = { output: CPSessionOutput };

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "text-green-400 bg-green-400/10",
  medium: "text-yellow-400 bg-yellow-400/10",
  low: "text-red-400 bg-red-400/10",
};

export function ROIProjectionsView({ output }: Props) {
  const data = output.metadata as unknown as ROIProjections;

  return (
    <div className="space-y-6">
      {/* Summary metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-border rounded-xl p-4 text-center">
          <span className="text-xs text-muted-foreground uppercase block mb-1">
            Total Expected Pipeline
          </span>
          <span className="text-xl font-semibold text-foreground">
            ${data.total_expected_pipeline.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground block mt-0.5">
            /month
          </span>
        </div>
        <div className="border border-border rounded-xl p-4 text-center">
          <span className="text-xs text-muted-foreground uppercase block mb-1">
            Blended CAC
          </span>
          <span className="text-xl font-semibold text-foreground">
            ${data.blended_cac.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Per-channel projections */}
      <div className="space-y-3">
        {data.projections.map((proj, i) => (
          <div key={i} className="border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">
                {proj.channel}
              </h4>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  CONFIDENCE_COLORS[proj.confidence] ?? "bg-secondary text-muted-foreground"
                }`}
              >
                {proj.confidence} confidence
              </span>
            </div>

            <div className="px-5 py-3 grid grid-cols-4 gap-4">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">
                  Monthly Spend
                </span>
                <span className="text-sm font-medium text-foreground">
                  ${proj.monthly_spend.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">
                  Expected Leads
                </span>
                <span className="text-sm font-medium text-foreground">
                  {proj.expected_leads}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">
                  Expected Pipeline
                </span>
                <span className="text-sm font-medium text-foreground">
                  ${proj.expected_pipeline.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">
                  Estimated CAC
                </span>
                <span className="text-sm font-medium text-foreground">
                  ${proj.estimated_cac.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-border">
              <p className="text-xs text-foreground/80 mb-2">
                {proj.roi_assessment}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {proj.assumptions.map((a, j) => (
                  <span
                    key={j}
                    className="text-[10px] px-2 py-0.5 bg-secondary text-muted-foreground rounded"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Key Risks */}
      <div className="border border-border rounded-xl p-5">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Key Risks
        </h3>
        <ul className="space-y-1.5">
          {data.key_risks.map((risk, i) => (
            <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
              <span className="text-red-400 shrink-0 mt-1">&#8226;</span>
              {risk}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
