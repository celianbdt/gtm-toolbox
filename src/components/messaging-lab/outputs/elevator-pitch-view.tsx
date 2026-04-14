"use client";

import type { MLSessionOutput } from "@/lib/messaging-lab/types";
import type { ElevatorPitch } from "@/lib/messaging-lab/schemas";
import { Clock, Zap, MessageSquare } from "lucide-react";

type Props = { output: MLSessionOutput };

export function ElevatorPitchView({ output }: Props) {
  const ep = output.metadata as unknown as ElevatorPitch;

  return (
    <div className="space-y-6">
      {/* Key Hook */}
      <div className="border border-[#8a6e4e]/20 rounded-xl p-5 bg-[#8a6e4e]/5">
        <div className="flex items-center gap-1.5 mb-2">
          <Zap className="size-3.5 text-[#c4a882]" />
          <h3 className="text-xs font-medium text-[#c4a882] uppercase tracking-wider">Key Hook</h3>
        </div>
        <p className="text-base font-medium text-foreground">{ep.key_hook}</p>
      </div>

      {/* 30s Pitch */}
      <div className="border border-border rounded-xl p-5">
        <div className="flex items-center gap-1.5 mb-3">
          <Clock className="size-3.5 text-muted-foreground" />
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">30-Second Pitch</h3>
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed">{ep.pitch_30s}</p>
      </div>

      {/* 60s Pitch */}
      <div className="border border-border rounded-xl p-5">
        <div className="flex items-center gap-1.5 mb-3">
          <Clock className="size-3.5 text-muted-foreground" />
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">60-Second Pitch</h3>
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed">{ep.pitch_60s}</p>
      </div>

      {/* 2min Pitch */}
      <div className="border border-border rounded-xl p-5">
        <div className="flex items-center gap-1.5 mb-3">
          <Clock className="size-3.5 text-muted-foreground" />
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">2-Minute Pitch</h3>
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{ep.pitch_2min}</p>
      </div>

      {/* Conversation Starters */}
      <div className="border border-border rounded-xl p-5">
        <div className="flex items-center gap-1.5 mb-3">
          <MessageSquare className="size-3.5 text-[#c4a882]" />
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Conversation Starters</h3>
        </div>
        <ul className="space-y-2">
          {ep.conversation_starters.map((starter, i) => (
            <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
              <span className="text-[#c4a882] shrink-0 mt-1">&#8226;</span>
              {starter}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
