"use client";

import { useCallback, useEffect, useState } from "react";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  Coins,
  Database,
  TrendingDown,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ENRICHER_LABELS } from "@/lib/ops-engine/types";
import type { EnricherProvider } from "@/lib/ops-engine/types";
import { BudgetSettings } from "./budget-settings";

type ProviderData = {
  provider: EnricherProvider;
  api_calls: number;
  estimated_cost: number;
};

type CostData = {
  workspace_id: string;
  month: string;
  budget: {
    within_budget: boolean;
    used: number;
    limit: number;
    remaining: number;
    usage_pct: number;
  };
  providers: ProviderData[];
  total_cost: number;
  total_calls: number;
  cache_savings_estimate: number;
};

function formatCurrency(value: number): string {
  return `€${value.toFixed(2)}`;
}

function budgetColor(pct: number): string {
  if (pct < 60) return "bg-emerald-500";
  if (pct < 80) return "bg-amber-500";
  return "bg-red-500";
}

function budgetTextColor(pct: number): string {
  if (pct < 60) return "text-emerald-400";
  if (pct < 80) return "text-amber-400";
  return "text-red-400";
}

export function CostDashboard({ onBack }: { onBack: () => void }) {
  const workspace = useWorkspace();
  const [data, setData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/ops-engine/cost?workspace_id=${workspace.id}&month=${month}`
      );
      if (!res.ok) throw new Error("Failed to load cost data");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [workspace.id, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function changeMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }

  const monthLabel = (() => {
    const [y, m] = month.split("-").map(Number);
    return new Date(y, m - 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  })();

  return (
    <div className="flex flex-col gap-6 p-6 overflow-y-auto flex-1">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="size-4" />
          Back
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <h2 className="text-sm font-medium">Cost Management</h2>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="size-8 p-0"
          onClick={() => changeMonth(-1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium min-w-[140px] text-center">
          {monthLabel}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="size-8 p-0"
          onClick={() => changeMonth(1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {loading ? (
        <LoadingSkeleton />
      ) : data ? (
        <>
          {/* Budget overview */}
          <BudgetOverview data={data} />

          {/* Provider breakdown */}
          <ProviderBreakdown providers={data.providers} total={data.total_cost} />

          {/* Cache efficiency */}
          <CacheEfficiency
            savings={data.cache_savings_estimate}
            totalCalls={data.total_calls}
          />

          {/* Budget settings (collapsible) */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {settingsOpen ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
              Budget Settings
            </button>
            {settingsOpen && (
              <BudgetSettings
                workspaceId={workspace.id}
                currentUsage={data.budget.used}
              />
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

/* ── Sub-components ── */

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-60 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
    </div>
  );
}

function BudgetOverview({ data }: { data: CostData }) {
  const { budget, total_cost, total_calls } = data;
  const pct = budget.usage_pct;

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="size-4 text-violet-400" />
            <CardTitle>Budget Overview</CardTitle>
          </div>
          <Badge
            variant={budget.within_budget ? "secondary" : "destructive"}
            className="text-xs"
          >
            {budget.within_budget ? "Within budget" : "Over budget"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Progress bar */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className={budgetTextColor(pct)}>
              {budget.used} / {budget.limit} enrichments
            </span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${budgetColor(pct)}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col">
            <span className="text-lg font-semibold">
              {formatCurrency(total_cost)}
            </span>
            <span className="text-xs text-muted-foreground">
              Estimated cost
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold">{total_calls}</span>
            <span className="text-xs text-muted-foreground">API calls</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold">{budget.remaining}</span>
            <span className="text-xs text-muted-foreground">Remaining</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProviderBreakdown({
  providers,
  total,
}: {
  providers: ProviderData[];
  total: number;
}) {
  if (providers.length === 0) {
    return (
      <Card size="sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-violet-400" />
            <CardTitle>Provider Breakdown</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No enrichment calls this month.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sorted = [...providers].sort(
    (a, b) => b.estimated_cost - a.estimated_cost
  );
  const maxCost = sorted[0]?.estimated_cost ?? 1;

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-violet-400" />
          <CardTitle>Provider Breakdown</CardTitle>
        </div>
        <CardDescription>
          {providers.length} provider{providers.length > 1 ? "s" : ""} used this
          month
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {/* Header */}
          <div className="grid grid-cols-[1fr_80px_100px_60px] gap-2 text-xs text-muted-foreground font-medium">
            <span>Provider</span>
            <span className="text-right">Calls</span>
            <span className="text-right">Cost</span>
            <span className="text-right">%</span>
          </div>

          <Separator />

          {/* Rows */}
          {sorted.map((p) => {
            const pct = total > 0 ? (p.estimated_cost / total) * 100 : 0;
            const barWidth =
              maxCost > 0 ? (p.estimated_cost / maxCost) * 100 : 0;

            return (
              <div key={p.provider} className="flex flex-col gap-1.5">
                <div className="grid grid-cols-[1fr_80px_100px_60px] gap-2 items-center text-sm">
                  <span className="font-medium truncate">
                    {ENRICHER_LABELS[p.provider] ?? p.provider}
                  </span>
                  <span className="text-right text-muted-foreground">
                    {p.api_calls}
                  </span>
                  <span className="text-right">
                    {formatCurrency(p.estimated_cost)}
                  </span>
                  <span className="text-right text-muted-foreground text-xs">
                    {pct.toFixed(1)}%
                  </span>
                </div>
                <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function CacheEfficiency({
  savings,
  totalCalls,
}: {
  savings: number;
  totalCalls: number;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="size-4 text-violet-400" />
          <CardTitle>Cache Efficiency</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <TrendingDown className="size-4 text-emerald-400" />
              <span className="text-lg font-semibold">
                {formatCurrency(savings)}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              Estimated savings from cache
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-lg font-semibold">
              {totalCalls > 0
                ? `${Math.round((savings / (savings + totalCalls * 0.01)) * 100)}%`
                : "—"}
            </span>
            <span className="text-xs text-muted-foreground">
              Effective cache hit rate
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
