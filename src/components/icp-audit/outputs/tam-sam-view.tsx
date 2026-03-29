"use client";

import type { ICASessionOutput } from "@/lib/icp-audit/types";
import type { TAMSAMAnalysis } from "@/lib/icp-audit/schemas";

type Props = { output: ICASessionOutput };

export function TAMSAMView({ output }: Props) {
  const analysis = output.metadata as unknown as TAMSAMAnalysis;

  return (
    <div className="space-y-6">
      {/* TAM / SAM / SOM Overview */}
      <div className="border border-border rounded-xl p-5">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Market Sizing</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-secondary/30 rounded-lg">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">TAM</p>
            <p className="text-xl font-bold text-foreground">{analysis.tam_estimate}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Total Addressable</p>
          </div>
          <div className="text-center p-4 bg-secondary/30 rounded-lg">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">SAM</p>
            <p className="text-xl font-bold text-[#A78BFA]">{analysis.sam_estimate}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Serviceable Addressable</p>
          </div>
          <div className="text-center p-4 bg-secondary/30 rounded-lg">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">SOM</p>
            <p className="text-xl font-bold text-[#7C3AED]">{analysis.som_estimate}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Serviceable Obtainable</p>
          </div>
        </div>
        <p className="text-sm text-foreground/80 mt-4 leading-relaxed">{analysis.methodology}</p>
      </div>

      {/* Segments Breakdown */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Segment Breakdown</h3>
        </div>
        <div className="divide-y divide-border">
          {analysis.segments.map((seg, i) => (
            <div key={i} className="px-5 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground">{seg.name}</span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>TAM: {seg.tam_share}</span>
                  <span>SAM: {seg.sam_share}</span>
                  {seg.growth_rate && <span className="text-green-400">{seg.growth_rate} growth</span>}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{seg.notes}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Key Assumptions */}
      <div className="border border-border rounded-xl p-5">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Key Assumptions</h3>
        <ul className="space-y-1.5">
          {analysis.key_assumptions.map((a, i) => (
            <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
              <span className="text-muted-foreground shrink-0 mt-1">&#8226;</span>
              {a}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
