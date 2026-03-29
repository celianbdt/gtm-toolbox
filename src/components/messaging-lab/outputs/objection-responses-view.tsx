"use client";

import type { MLSessionOutput } from "@/lib/messaging-lab/types";
import type { ObjectionResponses } from "@/lib/messaging-lab/schemas";
import { MessageCircle, ArrowRight } from "lucide-react";

type Props = { output: MLSessionOutput };

const FREQ_COLORS: Record<string, string> = {
  very_common: "text-red-400 bg-red-400/10",
  common: "text-orange-400 bg-orange-400/10",
  occasional: "text-yellow-400 bg-yellow-400/10",
};

export function ObjectionResponsesView({ output }: Props) {
  const or = output.metadata as unknown as ObjectionResponses;

  return (
    <div className="space-y-4">
      {or.objections.map((obj, i) => (
        <div key={i} className="border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <MessageCircle className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-foreground">&ldquo;{obj.objection}&rdquo;</p>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${FREQ_COLORS[obj.frequency] ?? ""}`}>
                {obj.frequency.replace("_", " ")}
              </span>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <div>
              <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Quick Response</h4>
              <p className="text-sm text-foreground/90">{obj.short_response}</p>
            </div>
            <div>
              <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Detailed Response</h4>
              <p className="text-sm text-foreground/80 leading-relaxed">{obj.detailed_response}</p>
            </div>
            {obj.proof_points.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {obj.proof_points.map((pp, j) => (
                  <span key={j} className="text-[10px] px-2 py-0.5 bg-[#7C3AED]/10 text-[#A78BFA] rounded-full">
                    {pp}
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1.5 pt-1">
              <ArrowRight className="size-3 text-[#A78BFA]" />
              <p className="text-xs text-muted-foreground italic">{obj.follow_up_question}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
