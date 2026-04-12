"use client";

import { useCallback, useEffect, useState } from "react";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type MetricDefinition = {
  id: string;
  workspace_id: string;
  metric_name: string;
  label: string;
  unit?: string | null;
  created_at: string;
};

type WorkspaceMetric = {
  id: string;
  workspace_id: string;
  week_date: string;
  metric_name: string;
  metric_value: number;
  created_at: string;
};

function Sparkline({
  values,
  color,
}: {
  values: number[];
  color: string;
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const width = 80;
  const height = 24;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - (v / max) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
      />
    </svg>
  );
}

function TrendIndicator({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) {
  if (previous === 0 && current === 0) {
    return <span className="text-xs text-muted-foreground">--</span>;
  }

  if (previous === 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs text-emerald-500">
        <ArrowUp />
        new
      </span>
    );
  }

  const change = ((current - previous) / previous) * 100;
  const rounded = Math.round(change);

  if (rounded === 0) {
    return <span className="text-xs text-muted-foreground">0%</span>;
  }

  const isPositive = rounded > 0;

  return (
    <span
      className={`flex items-center gap-0.5 text-xs ${
        isPositive ? "text-emerald-500" : "text-red-500"
      }`}
    >
      {isPositive ? <ArrowUp /> : <ArrowDown />}
      {isPositive ? "+" : ""}
      {rounded}%
    </span>
  );
}

function ArrowUp() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      className="shrink-0"
    >
      <path
        d="M6 2.5V9.5M6 2.5L3 5.5M6 2.5L9 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowDown() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      className="shrink-0"
    >
      <path
        d="M6 9.5V2.5M6 9.5L3 6.5M6 9.5L9 6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getWeekMondays(weeks: number): string[] {
  const result: string[] = [];
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(monday);
    d.setDate(monday.getDate() - i * 7);
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
}

export function MetricsSparklines() {
  const workspace = useWorkspace();
  const [definitions, setDefinitions] = useState<MetricDefinition[]>([]);
  const [metrics, setMetrics] = useState<WorkspaceMetric[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [defsRes, metricsRes] = await Promise.all([
        fetch(
          `/api/project/metrics/definitions?workspace_id=${workspace.id}`
        ),
        fetch(
          `/api/project/metrics?workspace_id=${workspace.id}&weeks=4`
        ),
      ]);

      const defs: MetricDefinition[] = defsRes.ok ? await defsRes.json() : [];
      const data: WorkspaceMetric[] = metricsRes.ok
        ? await metricsRes.json()
        : [];

      setDefinitions(defs);
      setMetrics(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [workspace.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} size="sm">
            <CardContent className="flex items-center gap-4">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-16" />
              </div>
              <Skeleton className="h-6 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (definitions.length === 0) {
    return null;
  }

  const weeks = getWeekMondays(4);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {definitions.map((def) => {
        const weekValues = weeks.map((weekDate) => {
          const m = metrics.find(
            (metric) =>
              metric.metric_name === def.metric_name &&
              metric.week_date === weekDate
          );
          return m ? m.metric_value : 0;
        });

        const current = weekValues[weekValues.length - 1];
        const previous = weekValues[weekValues.length - 2];

        return (
          <Card key={def.id} size="sm">
            <CardContent className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">
                  {def.label}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tabular-nums">
                    {current}
                  </span>
                  {def.unit && (
                    <span className="text-xs text-muted-foreground">
                      {def.unit}
                    </span>
                  )}
                </div>
                <TrendIndicator current={current} previous={previous} />
              </div>
              <Sparkline values={weekValues} color="hsl(var(--primary))" />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
