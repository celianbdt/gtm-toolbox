"use client";

import { useCallback, useEffect, useState } from "react";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

function getMondayDate(): string {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

function formatMondayLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function MetricsForm() {
  const workspace = useWorkspace();
  const [definitions, setDefinitions] = useState<MetricDefinition[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const mondayDate = getMondayDate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [defsRes, metricsRes] = await Promise.all([
        fetch(
          `/api/project/metrics/definitions?workspace_id=${workspace.id}`
        ),
        fetch(
          `/api/project/metrics?workspace_id=${workspace.id}&weeks=1`
        ),
      ]);

      const defs: MetricDefinition[] = defsRes.ok ? await defsRes.json() : [];
      const metrics: WorkspaceMetric[] = metricsRes.ok
        ? await metricsRes.json()
        : [];

      setDefinitions(defs);

      const prefilled: Record<string, string> = {};
      for (const m of metrics) {
        if (m.week_date === mondayDate) {
          prefilled[m.metric_name] = String(m.metric_value);
        }
      }
      setValues(prefilled);
    } catch {
      // silently fail — API may not be ready yet
    } finally {
      setLoading(false);
    }
  }, [workspace.id, mondayDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const metrics = definitions.map((def) => ({
        metric_name: def.metric_name,
        metric_value: parseFloat(values[def.metric_name] || "0") || 0,
      }));

      await fetch("/api/project/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspace.id,
          week_date: mondayDate,
          metrics,
        }),
      });
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card size="sm">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (definitions.length === 0) {
    return (
      <Card size="sm">
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucune metrique configuree. Ajoutez des definitions ci-dessous.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          Metriques — Semaine du {formatMondayLabel(mondayDate)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {definitions.map((def) => (
          <div key={def.id} className="flex items-center gap-3">
            <label className="min-w-[140px] text-sm text-muted-foreground shrink-0">
              {def.label}
            </label>
            <Input
              type="number"
              min={0}
              step="any"
              placeholder="0"
              value={values[def.metric_name] ?? ""}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  [def.metric_name]: e.target.value,
                }))
              }
              className="max-w-[120px]"
            />
            {def.unit && (
              <span className="text-xs text-muted-foreground">{def.unit}</span>
            )}
          </div>
        ))}
        <div className="pt-2">
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
