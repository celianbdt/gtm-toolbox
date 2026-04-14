"use client";

import type { MLSessionOutput } from "@/lib/messaging-lab/types";
import type { MessagingFramework } from "@/lib/messaging-lab/schemas";
import { Layers, MessageSquare, Check, X } from "lucide-react";

type Props = { output: MLSessionOutput };

export function MessagingFrameworkView({ output }: Props) {
  const fw = output.metadata as unknown as MessagingFramework;

  return (
    <div className="space-y-6">
      {/* Positioning Statement */}
      <div className="border border-border rounded-xl p-5">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Positioning Statement
        </h3>
        <p className="text-base text-foreground leading-relaxed font-medium">{fw.positioning_statement}</p>
        <p className="text-xs text-muted-foreground mt-2">Category: {fw.category}</p>
      </div>

      {/* Pillars */}
      <div className="border border-border rounded-xl p-5">
        <div className="flex items-center gap-1.5 mb-4">
          <Layers className="size-3.5 text-[#c4a882]" />
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Messaging Pillars
          </h3>
        </div>
        <div className="space-y-4">
          {fw.pillars.map((pillar, i) => (
            <div key={i} className="border-l-2 border-[#8a6e4e]/30 pl-4">
              <h4 className="text-sm font-semibold text-foreground">{pillar.pillar}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">{pillar.description}</p>
              <p className="text-sm text-foreground/90 mt-2 italic">&ldquo;{pillar.key_message}&rdquo;</p>
              {pillar.proof_points.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {pillar.proof_points.map((pp, j) => (
                    <span key={j} className="text-[10px] px-2 py-0.5 bg-secondary/50 text-muted-foreground rounded-full">
                      {pp}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Brand Voice */}
      <div className="border border-border rounded-xl p-5">
        <div className="flex items-center gap-1.5 mb-4">
          <MessageSquare className="size-3.5 text-[#c4a882]" />
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Brand Voice
          </h3>
        </div>
        <p className="text-sm text-foreground mb-3">Tone: <span className="font-medium">{fw.brand_voice.tone}</span></p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs text-green-400 font-medium flex items-center gap-1 mb-2">
              <Check className="size-3" /> Do
            </h4>
            <ul className="space-y-1">
              {fw.brand_voice.do_list.map((item, i) => (
                <li key={i} className="text-xs text-foreground/90">{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs text-red-400 font-medium flex items-center gap-1 mb-2">
              <X className="size-3" /> Don&apos;t
            </h4>
            <ul className="space-y-1">
              {fw.brand_voice.dont_list.map((item, i) => (
                <li key={i} className="text-xs text-foreground/90">{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Competitive Narrative */}
      <div className="border border-border rounded-xl p-5">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Competitive Narrative
        </h3>
        <p className="text-sm text-foreground/90 leading-relaxed">{fw.competitive_narrative}</p>
      </div>
    </div>
  );
}
