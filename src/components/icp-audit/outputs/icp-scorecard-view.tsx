"use client";

import type { ICASessionOutput } from "@/lib/icp-audit/types";
import type { ICPScorecard } from "@/lib/icp-audit/schemas";

type Props = { output: ICASessionOutput };

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

function getScoreBg(score: number): string {
  if (score >= 80) return "bg-green-400";
  if (score >= 60) return "bg-yellow-400";
  if (score >= 40) return "bg-orange-400";
  return "bg-red-400";
}

export function ICPScorecardView({ output }: Props) {
  const scorecard = output.metadata as unknown as ICPScorecard;

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="border border-border rounded-xl p-6 text-center">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">ICP Health Score</p>
        <div className={`text-5xl font-bold ${getScoreColor(scorecard.overall_score)}`}>
          {scorecard.overall_score}
        </div>
        <p className="text-xs text-muted-foreground mt-1">/ 100</p>
        <p className="text-sm text-foreground/80 mt-4 max-w-md mx-auto leading-relaxed">
          {scorecard.overall_assessment}
        </p>
      </div>

      {/* Dimensions */}
      <div className="border border-border rounded-xl p-5">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Dimension Scores</h3>
        <div className="space-y-3">
          {scorecard.dimensions.map((dim, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-foreground">{dim.name}</span>
                <span className={`text-sm font-medium ${getScoreColor(dim.score)}`}>
                  {dim.score}
                </span>
              </div>
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${getScoreBg(dim.score)}`}
                  style={{ width: `${dim.score}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{dim.assessment}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths & Gaps */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-border rounded-xl p-5">
          <h3 className="text-xs font-medium text-green-400 uppercase tracking-wider mb-3">Top Strengths</h3>
          <ul className="space-y-1.5">
            {scorecard.top_strengths.map((s, i) => (
              <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                <span className="text-green-400 shrink-0 mt-1">&#8226;</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="border border-border rounded-xl p-5">
          <h3 className="text-xs font-medium text-red-400 uppercase tracking-wider mb-3">Critical Gaps</h3>
          <ul className="space-y-1.5">
            {scorecard.critical_gaps.map((g, i) => (
              <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                <span className="text-red-400 shrink-0 mt-1">&#8226;</span>
                {g}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
