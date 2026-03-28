"use client";

import type { CISessionOutput } from "@/lib/competitive-intel/types";
import type { BattleCard } from "@/lib/competitive-intel/schemas";
import { Shield, AlertTriangle, Zap, MessageCircle } from "lucide-react";

type Props = { output: CISessionOutput };

const THREAT_COLORS: Record<string, string> = {
  critical: "text-red-400 bg-red-400/10",
  high: "text-orange-400 bg-orange-400/10",
  medium: "text-yellow-400 bg-yellow-400/10",
  low: "text-green-400 bg-green-400/10",
};

export function BattleCardView({ output }: Props) {
  const card = output.metadata as unknown as BattleCard;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">{card.competitor_name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{card.one_liner}</p>
        </div>
        <div className="flex gap-2">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${THREAT_COLORS[card.threat_level] ?? ""}`}>
            {card.threat_level} threat
          </span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
            {card.target_overlap} overlap
          </span>
        </div>
      </div>

      <div className="p-5 grid grid-cols-2 gap-5">
        {/* Strengths */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Shield className="size-3.5 text-red-400" />
            <h4 className="text-xs font-medium text-muted-foreground uppercase">Their Strengths</h4>
          </div>
          <ul className="space-y-2">
            {card.strengths.map((s, i) => (
              <li key={i} className="text-sm">
                <span className="text-foreground font-medium">{s.point}</span>
                <span className="text-muted-foreground text-xs block mt-0.5">{s.evidence}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Weaknesses */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Zap className="size-3.5 text-green-400" />
            <h4 className="text-xs font-medium text-muted-foreground uppercase">Exploitable Weaknesses</h4>
          </div>
          <ul className="space-y-2">
            {card.weaknesses.map((w, i) => (
              <li key={i} className="text-sm">
                <span className="text-foreground font-medium">{w.point}</span>
                <span className="text-muted-foreground text-xs block mt-0.5">{w.how_to_exploit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Landmines */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="size-3.5 text-[#A78BFA]" />
            <h4 className="text-xs font-medium text-muted-foreground uppercase">Landmine Questions</h4>
          </div>
          <ul className="space-y-1">
            {card.landmines.map((l, i) => (
              <li key={i} className="text-sm text-foreground">&ldquo;{l}&rdquo;</li>
            ))}
          </ul>
        </div>

        {/* Traps to Avoid */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="size-3.5 text-orange-400" />
            <h4 className="text-xs font-medium text-muted-foreground uppercase">Traps to Avoid</h4>
          </div>
          <ul className="space-y-1">
            {card.traps_to_avoid.map((t, i) => (
              <li key={i} className="text-sm text-foreground">{t}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Winning Talk Track */}
      <div className="px-5 py-4 border-t border-border">
        <div className="flex items-center gap-1.5 mb-2">
          <MessageCircle className="size-3.5 text-[#7C3AED]" />
          <h4 className="text-xs font-medium text-muted-foreground uppercase">Winning Talk Track</h4>
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed">{card.winning_talk_track}</p>
      </div>

      {/* Differentiators */}
      {card.key_differentiators.length > 0 && (
        <div className="px-5 py-4 border-t border-border">
          <h4 className="text-xs font-medium text-muted-foreground uppercase mb-3">Key Differentiators</h4>
          <div className="space-y-2">
            {card.key_differentiators.map((d, i) => (
              <div key={i} className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block mb-0.5">Our advantage</span>
                  <span className="text-green-400">{d.our_advantage}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5">Their claim</span>
                  <span className="text-foreground">{d.their_claim}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5">Reality</span>
                  <span className="text-foreground">{d.reality}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
