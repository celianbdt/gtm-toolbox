"use client";

import type { CISessionOutput } from "@/lib/competitive-intel/types";
import type { ThreatAssessment } from "@/lib/competitive-intel/schemas";
import { AlertTriangle, Lightbulb } from "lucide-react";

type Props = { output: CISessionOutput };

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-red-400 border-red-400/30",
  high: "text-orange-400 border-orange-400/30",
  medium: "text-yellow-400 border-yellow-400/30",
  low: "text-green-400 border-green-400/30",
};

const EFFORT_LABELS: Record<string, string> = {
  low: "Low effort",
  medium: "Medium effort",
  high: "High effort",
};

export function ThreatAssessmentView({ output }: Props) {
  const assessment = output.metadata as unknown as ThreatAssessment;

  return (
    <div className="space-y-6">
      {/* Threats */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <AlertTriangle className="size-4 text-red-400" />
          <h3 className="text-base font-semibold text-foreground">Threats</h3>
          <span className="text-xs text-muted-foreground ml-auto">{assessment.threats.length}</span>
        </div>
        <div className="divide-y divide-border">
          {assessment.threats.map((threat, i) => (
            <div key={i} className={`px-5 py-3 border-l-2 ${SEVERITY_COLORS[threat.severity] ?? ""}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-foreground">{threat.competitor}</span>
                <span className="text-[10px] text-muted-foreground capitalize">{threat.severity} · {threat.timeframe.replace("_", " ")}</span>
              </div>
              <p className="text-sm text-foreground/90">{threat.threat}</p>
              <p className="text-xs text-muted-foreground mt-1">{threat.recommended_action}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Opportunities */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Lightbulb className="size-4 text-green-400" />
          <h3 className="text-base font-semibold text-foreground">Opportunities</h3>
          <span className="text-xs text-muted-foreground ml-auto">{assessment.opportunities.length}</span>
        </div>
        <div className="divide-y divide-border">
          {assessment.opportunities.map((opp, i) => (
            <div key={i} className="px-5 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted-foreground">
                  vs {opp.competitors_affected.join(", ")}
                </span>
                <span className="text-[10px] text-muted-foreground ml-auto">{EFFORT_LABELS[opp.effort]}</span>
              </div>
              <p className="text-sm text-foreground/90">{opp.description}</p>
              <p className="text-xs text-[#A78BFA] mt-1">{opp.action}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Overall Position */}
      <div className="p-5 bg-secondary/30 rounded-xl">
        <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Overall Competitive Position</h4>
        <p className="text-sm text-foreground/90 leading-relaxed">{assessment.overall_competitive_position}</p>
      </div>
    </div>
  );
}
