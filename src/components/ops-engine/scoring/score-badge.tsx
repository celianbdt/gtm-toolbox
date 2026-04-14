"use client";

import { Badge } from "@/components/ui/badge";
import type { ThresholdTier } from "@/lib/ops-engine/types";
import { TIER_LABELS } from "@/lib/ops-engine/types";
import { cn } from "@/lib/utils";

const TIER_STYLES: Record<ThresholdTier, string> = {
  ignored: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  cold: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  warm: "bg-primary/10 text-amber-500 border-primary/20",
  hot: "bg-red-500/10 text-red-500 border-red-500/20",
  priority: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

export function ScoreBadge({
  tier,
  score,
  className,
}: {
  tier: ThresholdTier;
  score?: number;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(TIER_STYLES[tier], "font-mono text-[11px]", className)}
    >
      {score !== undefined && (
        <span className="font-semibold">{score}</span>
      )}
      <span>{TIER_LABELS[tier]}</span>
    </Badge>
  );
}
