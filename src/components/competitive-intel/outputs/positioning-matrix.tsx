"use client";

import type { CISessionOutput } from "@/lib/competitive-intel/types";
import type { PositioningMatrix } from "@/lib/competitive-intel/schemas";

type Props = { output: CISessionOutput };

export function PositioningMatrixView({ output }: Props) {
  const matrix = output.metadata as unknown as PositioningMatrix;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-base font-semibold text-foreground">Positioning Matrix</h3>
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
          <div className="absolute bottom-1 left-1 text-[9px] text-muted-foreground/50">
            {matrix.axes.y.low_label}
          </div>

          {/* Grid lines */}
          <div className="absolute inset-0 grid grid-cols-4 grid-rows-4">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="border border-border/30" />
            ))}
          </div>

          {/* Players */}
          {matrix.players.map((player, i) => (
            <div
              key={i}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${player.x}%`,
                bottom: `${player.y}%`,
              }}
            >
              <div
                className={`w-3 h-3 rounded-full border-2 ${
                  player.is_us
                    ? "bg-[#8a6e4e] border-[#c4a882]"
                    : "bg-muted-foreground/60 border-muted-foreground"
                }`}
              />
              <span className={`absolute top-4 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap ${
                player.is_us ? "text-[#c4a882] font-medium" : "text-muted-foreground"
              }`}>
                {player.name}
              </span>
            </div>
          ))}
        </div>

        {/* Insight */}
        <div className="mt-8 p-4 bg-secondary/30 rounded-lg">
          <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Positioning Insight</h4>
          <p className="text-sm text-foreground/90 leading-relaxed">{matrix.insight}</p>
        </div>

        {/* Player annotations */}
        <div className="mt-4 space-y-2">
          {matrix.players.map((player, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <div
                className={`w-2 h-2 rounded-full mt-1 shrink-0 ${
                  player.is_us ? "bg-[#8a6e4e]" : "bg-muted-foreground/60"
                }`}
              />
              <div>
                <span className="font-medium text-foreground">{player.name}</span>
                <span className="text-muted-foreground ml-1.5">{player.annotation}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
