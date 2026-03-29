"use client";

import type { ICASessionOutput } from "@/lib/icp-audit/types";
import type { PrioritizationMatrix } from "@/lib/icp-audit/schemas";

type Props = { output: ICASessionOutput };

const PRIORITY_COLORS: Record<string, { dot: string; text: string }> = {
  high: { dot: "bg-green-400", text: "text-green-400" },
  medium: { dot: "bg-yellow-400", text: "text-yellow-400" },
  low: { dot: "bg-red-400", text: "text-red-400" },
};

export function PrioritizationMatrixView({ output }: Props) {
  const matrix = output.metadata as unknown as PrioritizationMatrix;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-base font-semibold text-foreground">Segment Prioritization Matrix</h3>
      </div>

      {/* Matrix visualization */}
      <div className="p-5">
        <div className="relative w-full aspect-square max-w-lg mx-auto bg-secondary/20 rounded-lg border border-border">
          {/* Axis labels */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-6 text-[10px] text-muted-foreground">
            {matrix.axes.x.label}
          </div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 -rotate-90 text-[10px] text-muted-foreground whitespace-nowrap">
            {matrix.axes.y.label}
          </div>
          <div className="absolute bottom-1 left-1 text-[9px] text-muted-foreground/50">
            {matrix.axes.x.low_label}
          </div>
          <div className="absolute bottom-1 right-1 text-[9px] text-muted-foreground/50">
            {matrix.axes.x.high_label}
          </div>
          <div className="absolute top-1 left-1 text-[9px] text-muted-foreground/50">
            {matrix.axes.y.high_label}
          </div>

          {/* Grid */}
          <div className="absolute inset-0 grid grid-cols-4 grid-rows-4">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="border border-border/30" />
            ))}
          </div>

          {/* Segments */}
          {matrix.segments.map((seg, i) => {
            const colors = PRIORITY_COLORS[seg.priority] ?? PRIORITY_COLORS.medium;
            return (
              <div
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${seg.x}%`,
                  bottom: `${seg.y}%`,
                }}
              >
                <div className={`w-3 h-3 rounded-full border-2 ${colors.dot} border-white/30`} />
                <span className={`absolute top-4 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap font-medium ${colors.text}`}>
                  {seg.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Recommendation */}
        <div className="mt-8 p-4 bg-secondary/30 rounded-lg">
          <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Strategic Recommendation</h4>
          <p className="text-sm text-foreground/90 leading-relaxed">{matrix.recommendation}</p>
        </div>

        {/* Segment annotations */}
        <div className="mt-4 space-y-2">
          {matrix.segments.map((seg, i) => {
            const colors = PRIORITY_COLORS[seg.priority] ?? PRIORITY_COLORS.medium;
            return (
              <div key={i} className="flex items-start gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${colors.dot}`} />
                <div>
                  <span className="font-medium text-foreground">{seg.name}</span>
                  <span className={`ml-1.5 ${colors.text}`}>({seg.priority})</span>
                  <span className="text-muted-foreground ml-1.5">{seg.annotation}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
