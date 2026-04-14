"use client";

import type { ICASessionOutput } from "@/lib/icp-audit/types";
import type { PersonaCard } from "@/lib/icp-audit/schemas";
import { User, AlertCircle, Zap, MessageCircle } from "lucide-react";

type Props = { output: ICASessionOutput };

function getConfidenceColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

export function PersonaCardView({ output }: Props) {
  const persona = output.metadata as unknown as PersonaCard;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#8a6e4e]/15 border border-[#8a6e4e]/40 flex items-center justify-center">
            <User className="size-4 text-[#c4a882]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">{persona.persona_title}</h3>
            <p className="text-xs text-muted-foreground">{persona.role}</p>
          </div>
        </div>
        <div className="text-right">
          <span className={`text-lg font-bold ${getConfidenceColor(persona.confidence)}`}>
            {persona.confidence}%
          </span>
          <p className="text-[10px] text-muted-foreground">confidence</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Pain Points */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertCircle className="size-3.5 text-red-400" />
            <h4 className="text-xs font-medium text-muted-foreground uppercase">Refined Pain Points</h4>
          </div>
          <ul className="space-y-1">
            {persona.refined_pain_points.map((p, i) => (
              <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                <span className="text-red-400 shrink-0 mt-1">&#8226;</span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        {/* Buying Triggers & Objections */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Zap className="size-3.5 text-[#c4a882]" />
              <h4 className="text-xs font-medium text-muted-foreground uppercase">Buying Triggers</h4>
            </div>
            <ul className="space-y-1">
              {persona.buying_triggers.map((t, i) => (
                <li key={i} className="text-sm text-foreground/90">{t}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <AlertCircle className="size-3.5 text-orange-400" />
              <h4 className="text-xs font-medium text-muted-foreground uppercase">Objections</h4>
            </div>
            <ul className="space-y-1">
              {persona.objections.map((o, i) => (
                <li key={i} className="text-sm text-foreground/90">&ldquo;{o}&rdquo;</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Messaging Angle */}
        <div className="p-3 bg-[#8a6e4e]/5 rounded-lg border border-[#8a6e4e]/10">
          <div className="flex items-center gap-1.5 mb-1">
            <MessageCircle className="size-3.5 text-[#8a6e4e]" />
            <h4 className="text-xs font-medium text-muted-foreground uppercase">Messaging Angle</h4>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed">{persona.messaging_angle}</p>
        </div>

        {/* Refinement Notes */}
        {persona.refinement_notes && (
          <div className="p-3 bg-secondary/30 rounded-lg">
            <p className="text-xs text-muted-foreground uppercase mb-1">Refinement Notes</p>
            <p className="text-sm text-foreground/80 leading-relaxed">{persona.refinement_notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
