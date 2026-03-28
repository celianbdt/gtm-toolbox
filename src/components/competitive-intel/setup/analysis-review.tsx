"use client";

import type { CompetitorEntry, AnalysisFocus } from "@/lib/competitive-intel/types";
import { ANALYSIS_FOCUS_LABELS } from "@/lib/competitive-intel/types";

type Props = {
  competitors: CompetitorEntry[];
  focusDimensions: AnalysisFocus[];
  customQuestion: string;
  insightCount?: number;
};

const ANALYSTS = [
  { emoji: "\u{1F4CA}", name: "Market Analyst", color: "#3b82f6" },
  { emoji: "\u{1F52C}", name: "Product Strategist", color: "#8b5cf6" },
  { emoji: "\u{1F3AF}", name: "Sales Tactician", color: "#ef4444" },
  { emoji: "\u{1F9D1}\u200D\u{1F4BC}", name: "Customer Voice", color: "#06b6d4" },
];

export function AnalysisReview({
  competitors,
  focusDimensions,
  customQuestion,
  insightCount = 0,
}: Props) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-1">
        Review & Launch
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Verify the analysis configuration before launching.
      </p>

      <div className="space-y-5">
        {/* Competitors */}
        <div className="border border-border rounded-lg p-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Competitors ({competitors.length})
          </h3>
          <div className="space-y-2">
            {competitors.map((c) => (
              <div key={c.id} className="flex items-center justify-between">
                <span className="text-sm text-foreground font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">
                  {c.data_sources.length} source{c.data_sources.length !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Focus */}
        <div className="border border-border rounded-lg p-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Analysis Focus
          </h3>
          <div className="flex flex-wrap gap-2">
            {focusDimensions.map((f) => (
              <span
                key={f}
                className="text-xs px-2.5 py-1 bg-[#7C3AED]/10 text-[#A78BFA] rounded-full"
              >
                {ANALYSIS_FOCUS_LABELS[f]}
              </span>
            ))}
          </div>
          {customQuestion && (
            <p className="mt-3 text-sm text-muted-foreground italic">
              &ldquo;{customQuestion}&rdquo;
            </p>
          )}
        </div>

        {/* Analysts */}
        <div className="border border-border rounded-lg p-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Analyst Team
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {ANALYSTS.map((a) => (
              <div
                key={a.name}
                className="flex items-center gap-2 text-sm"
              >
                <span>{a.emoji}</span>
                <span className="text-foreground">{a.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cross-tool insights */}
        {insightCount > 0 && (
          <div className="border border-border rounded-lg p-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Cross-tool Insights
            </h3>
            <p className="text-sm text-foreground">
              {insightCount} session{insightCount > 1 ? "s" : ""} included as context
            </p>
          </div>
        )}

        {/* Process */}
        <div className="border border-border rounded-lg p-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Analysis Process
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-secondary rounded-full w-5 h-5 flex items-center justify-center">1</span>
              Data Processing — extract key intel from sources
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-secondary rounded-full w-5 h-5 flex items-center justify-center">2</span>
              Analyst Assessments — 4 independent perspectives
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-secondary rounded-full w-5 h-5 flex items-center justify-center">3</span>
              Cross-Analyst Debate — challenge and refine
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-secondary rounded-full w-5 h-5 flex items-center justify-center">4</span>
              Synthesis — generate battle cards, playbooks, matrix
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
