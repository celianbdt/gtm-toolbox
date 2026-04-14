"use client";

import type { MLSessionOutput } from "@/lib/messaging-lab/types";
import type { TaglineOptions } from "@/lib/messaging-lab/schemas";
import { Star, Quote } from "lucide-react";

type Props = { output: MLSessionOutput };

export function TaglineOptionsView({ output }: Props) {
  const tl = output.metadata as unknown as TaglineOptions;

  return (
    <div className="space-y-6">
      {tl.directions.map((dir, i) => (
        <div key={i} className="border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">{dir.direction_name}</h3>
              <span className="text-[10px] text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
                {dir.tone}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Best for: {dir.best_for}</p>
          </div>
          <div className="p-5 space-y-3">
            {dir.taglines.map((t, j) => (
              <div key={j} className="flex gap-3">
                <Quote className="size-3.5 text-[#c4a882] shrink-0 mt-1" />
                <div>
                  <p className="text-sm font-medium text-foreground">&ldquo;{t.tagline}&rdquo;</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.rationale}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Recommendation */}
      <div className="border border-[#8a6e4e]/20 rounded-xl p-5 bg-[#8a6e4e]/5">
        <div className="flex items-center gap-1.5 mb-2">
          <Star className="size-3.5 text-[#c4a882]" />
          <h3 className="text-xs font-medium text-[#c4a882] uppercase tracking-wider">
            Recommendation
          </h3>
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed">{tl.recommendation}</p>
      </div>
    </div>
  );
}
