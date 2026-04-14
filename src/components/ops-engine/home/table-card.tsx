"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { OpsTable, ThresholdTier } from "@/lib/ops-engine/types";
import { TIER_COLORS } from "@/lib/ops-engine/types";
import { Clock, Table2, Trash2 } from "lucide-react";

type TierDistribution = Partial<Record<ThresholdTier, number>>;

function TierBar({ distribution }: { distribution: TierDistribution }) {
  const tiers: ThresholdTier[] = [
    "ignored",
    "cold",
    "warm",
    "hot",
    "priority",
  ];
  const total = tiers.reduce((sum, t) => sum + (distribution[t] ?? 0), 0);
  if (total === 0) return null;

  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
      {tiers.map((tier) => {
        const count = distribution[tier] ?? 0;
        if (count === 0) return null;
        const pct = (count / total) * 100;
        return (
          <div
            key={tier}
            className="h-full transition-all"
            style={{
              width: `${pct}%`,
              backgroundColor: TIER_COLORS[tier],
            }}
          />
        );
      })}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function TableCard({
  table,
  rowCount,
  tierDistribution,
  onClick,
  onDelete,
}: {
  table: OpsTable;
  rowCount: number;
  tierDistribution: TierDistribution;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <Card
      size="sm"
      className="cursor-pointer transition-colors hover:ring-primary/40 hover:ring-2"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="truncate">{table.name}</CardTitle>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete "${table.name}"?`)) onDelete();
              }}
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
        {table.description && (
          <CardDescription className="line-clamp-1">
            {table.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Table2 className="size-3" />
            {rowCount} rows
          </Badge>
        </div>
        <TierBar distribution={tierDistribution} />
      </CardContent>
      <CardFooter>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3" />
          {timeAgo(table.updated_at)}
        </div>
      </CardFooter>
    </Card>
  );
}
