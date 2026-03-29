"use client";

import type { ICASessionOutput } from "@/lib/icp-audit/types";
import type { SegmentAnalysis } from "@/lib/icp-audit/schemas";
import { TrendingUp, TrendingDown, ArrowRight, LogOut } from "lucide-react";

type Props = { output: ICASessionOutput };

const REC_CONFIG: Record<string, { icon: typeof TrendingUp; label: string; color: string; bg: string }> = {
  "double-down": { icon: TrendingUp, label: "Double Down", color: "text-green-400", bg: "bg-green-400/10" },
  optimize: { icon: ArrowRight, label: "Optimize", color: "text-yellow-400", bg: "bg-yellow-400/10" },
  deprioritize: { icon: TrendingDown, label: "Deprioritize", color: "text-orange-400", bg: "bg-orange-400/10" },
  exit: { icon: LogOut, label: "Exit", color: "text-red-400", bg: "bg-red-400/10" },
};

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

export function SegmentAnalysisView({ output }: Props) {
  const seg = output.metadata as unknown as SegmentAnalysis;
  const recConfig = REC_CONFIG[seg.recommendation] ?? REC_CONFIG.optimize;
  const RecIcon = recConfig.icon;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">{seg.segment_name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${getScoreColor(seg.fit_score)}`}>
            {seg.fit_score}
          </span>
          <span className="text-xs text-muted-foreground">/100 fit</span>
          <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${recConfig.color} ${recConfig.bg}`}>
            <RecIcon className="size-3" />
            {recConfig.label}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Performance Metrics */}
        {(seg.current_performance.win_rate || seg.current_performance.avg_deal_size || seg.current_performance.retention_rate || seg.current_performance.nrr) && (
          <div className="grid grid-cols-4 gap-3">
            {seg.current_performance.win_rate && (
              <div className="text-center p-2 bg-secondary/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Win Rate</p>
                <p className="text-sm font-medium text-foreground">{seg.current_performance.win_rate}</p>
              </div>
            )}
            {seg.current_performance.avg_deal_size && (
              <div className="text-center p-2 bg-secondary/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Avg Deal</p>
                <p className="text-sm font-medium text-foreground">{seg.current_performance.avg_deal_size}</p>
              </div>
            )}
            {seg.current_performance.retention_rate && (
              <div className="text-center p-2 bg-secondary/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Retention</p>
                <p className="text-sm font-medium text-foreground">{seg.current_performance.retention_rate}</p>
              </div>
            )}
            {seg.current_performance.nrr && (
              <div className="text-center p-2 bg-secondary/30 rounded-lg">
                <p className="text-xs text-muted-foreground">NRR</p>
                <p className="text-sm font-medium text-foreground">{seg.current_performance.nrr}</p>
              </div>
            )}
          </div>
        )}

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-medium text-green-400 uppercase tracking-wider mb-2">Strengths</h4>
            <ul className="space-y-1">
              {seg.strengths.map((s, i) => (
                <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                  <span className="text-green-400 shrink-0 mt-1">&#8226;</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-medium text-red-400 uppercase tracking-wider mb-2">Weaknesses</h4>
            <ul className="space-y-1">
              {seg.weaknesses.map((w, i) => (
                <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                  <span className="text-red-400 shrink-0 mt-1">&#8226;</span>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Rationale */}
        <div className="p-3 bg-secondary/30 rounded-lg">
          <p className="text-xs text-muted-foreground uppercase mb-1">Rationale</p>
          <p className="text-sm text-foreground/90 leading-relaxed">{seg.rationale}</p>
        </div>
      </div>
    </div>
  );
}
