"use client";

import type { MLSessionOutput } from "@/lib/messaging-lab/types";
import type { ValuePropositions } from "@/lib/messaging-lab/schemas";

type Props = { output: MLSessionOutput };

const STRENGTH_COLORS: Record<string, string> = {
  primary: "text-green-400 bg-green-400/10",
  secondary: "text-blue-400 bg-blue-400/10",
  tertiary: "text-muted-foreground bg-secondary/50",
};

export function ValuePropositionsView({ output }: Props) {
  const vp = output.metadata as unknown as ValuePropositions;

  return (
    <div className="space-y-4">
      {vp.propositions.map((prop, i) => (
        <div key={i} className="border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">{prop.headline}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{prop.subheadline}</p>
            </div>
            <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full shrink-0 ${STRENGTH_COLORS[prop.strength] ?? ""}`}>
              {prop.strength}
            </span>
          </div>
          <div className="p-5 space-y-3">
            <p className="text-sm text-foreground/90 leading-relaxed">{prop.supporting_copy}</p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground uppercase">Target:</span>
              <span className="text-xs text-foreground">{prop.target_persona}</span>
            </div>
            {prop.proof_points.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {prop.proof_points.map((pp, j) => (
                  <span key={j} className="text-[10px] px-2 py-0.5 bg-[#8a6e4e]/10 text-[#c4a882] rounded-full">
                    {pp}
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground italic">{prop.rationale}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
