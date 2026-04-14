"use client";

import type { CISessionOutput } from "@/lib/competitive-intel/types";
import type { ObjectionPlaybook } from "@/lib/competitive-intel/schemas";

type Props = { output: CISessionOutput };

const FREQUENCY_LABELS: Record<string, { label: string; className: string }> = {
  very_common: { label: "Very Common", className: "text-red-400 bg-red-400/10" },
  common: { label: "Common", className: "text-orange-400 bg-orange-400/10" },
  occasional: { label: "Occasional", className: "text-yellow-400 bg-yellow-400/10" },
};

export function ObjectionPlaybookView({ output }: Props) {
  const playbook = output.metadata as unknown as ObjectionPlaybook;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-base font-semibold text-foreground">
          vs {playbook.competitor_name}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {playbook.objections.length} objection{playbook.objections.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="divide-y divide-border">
        {playbook.objections.map((obj, i) => {
          const freq = FREQUENCY_LABELS[obj.frequency];
          return (
            <div key={i} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-sm font-medium text-foreground">
                  &ldquo;{obj.objection}&rdquo;
                </p>
                {freq && (
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${freq.className}`}>
                    {freq.label}
                  </span>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground uppercase block mb-0.5">Response Strategy</span>
                  <p className="text-foreground/90">{obj.response_strategy}</p>
                </div>
                {obj.proof_points.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground uppercase block mb-0.5">Proof Points</span>
                    <ul className="space-y-0.5">
                      {obj.proof_points.map((pp, j) => (
                        <li key={j} className="text-foreground/80 text-xs">• {pp}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <span className="text-xs text-muted-foreground uppercase block mb-0.5">Follow-up Question</span>
                  <p className="text-[#c4a882] text-xs italic">&ldquo;{obj.follow_up_question}&rdquo;</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
