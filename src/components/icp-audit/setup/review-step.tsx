"use client";

import type { ICPSegment, ICPPersona, CustomerDataSource, WinLossEntry, AuditFocus } from "@/lib/icp-audit/types";
import { AUDIT_FOCUS_LABELS } from "@/lib/icp-audit/types";

type Props = {
  icpDefinition: string;
  segments: ICPSegment[];
  personas: ICPPersona[];
  customerData: CustomerDataSource[];
  winLossData: WinLossEntry[];
  focusDimensions: AuditFocus[];
  customQuestion: string;
  insightCount?: number;
};

const ANALYSTS = [
  { emoji: "\u{1F4CA}", name: "Market Researcher", color: "#3b82f6" },
  { emoji: "\u{1F49A}", name: "Customer Success Analyst", color: "#22c55e" },
  { emoji: "\u{1F3AF}", name: "Sales Intelligence", color: "#ef4444" },
  { emoji: "\u{1F52C}", name: "PMF Analyst", color: "#8a6e4e" },
];

export function ReviewStep({
  icpDefinition,
  segments,
  personas,
  customerData,
  winLossData,
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
        Verify the audit configuration before launching.
      </p>

      <div className="space-y-5">
        {/* ICP Definition */}
        <div className="border border-border rounded-lg p-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            ICP Definition
          </h3>
          <p className="text-sm text-foreground/90 line-clamp-3">{icpDefinition}</p>
        </div>

        {/* Segments */}
        <div className="border border-border rounded-lg p-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Segments ({segments.length})
          </h3>
          <div className="space-y-2">
            {segments.map((s) => (
              <div key={s.id} className="flex items-center justify-between">
                <span className="text-sm text-foreground font-medium">{s.name}</span>
                <span className="text-xs text-muted-foreground">
                  {[s.industry, s.company_size].filter(Boolean).join(" · ") || "No details"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Personas */}
        {personas.length > 0 && (
          <div className="border border-border rounded-lg p-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Personas ({personas.length})
            </h3>
            <div className="space-y-2">
              {personas.map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <span className="text-sm text-foreground font-medium">{p.title}</span>
                  <span className="text-xs text-muted-foreground">{p.role}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Sources */}
        <div className="border border-border rounded-lg p-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Data Sources
          </h3>
          <div className="flex gap-4 text-sm text-foreground">
            <span>{customerData.length} data source{customerData.length !== 1 ? "s" : ""}</span>
            <span className="text-muted-foreground/30">|</span>
            <span>{winLossData.filter((e) => e.type === "win").length} wins</span>
            <span className="text-muted-foreground/30">|</span>
            <span>{winLossData.filter((e) => e.type === "loss").length} losses</span>
          </div>
        </div>

        {/* Focus */}
        <div className="border border-border rounded-lg p-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Audit Focus
          </h3>
          <div className="flex flex-wrap gap-2">
            {focusDimensions.map((f) => (
              <span
                key={f}
                className="text-xs px-2.5 py-1 bg-[#8a6e4e]/10 text-[#c4a882] rounded-full"
              >
                {AUDIT_FOCUS_LABELS[f]}
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
              <div key={a.name} className="flex items-center gap-2 text-sm">
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
            Audit Process
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-secondary rounded-full w-5 h-5 flex items-center justify-center">1</span>
              Data Processing — extract structured insights from data
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
              Synthesis — generate scorecard, segments, personas, TAM/SAM
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
