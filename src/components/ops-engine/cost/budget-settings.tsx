"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings2, RotateCcw, Check, Loader2 } from "lucide-react";

type BudgetConfig = {
  monthly_enrichment_limit: number;
  alert_threshold_pct: number;
};

const DEFAULTS: BudgetConfig = {
  monthly_enrichment_limit: 500,
  alert_threshold_pct: 80,
};

export function BudgetSettings({
  workspaceId,
  currentUsage,
}: {
  workspaceId: string;
  currentUsage?: number;
}) {
  const [config, setConfig] = useState<BudgetConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/ops-engine/cost/budget?workspace_id=${workspaceId}`
      );
      if (!res.ok) throw new Error("Failed to load budget config");
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const res = await fetch("/api/ops-engine/cost/budget", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          ...config,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setConfig(DEFAULTS);
  }

  if (loading) {
    return (
      <Card size="sm">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const usagePct =
    currentUsage !== undefined && config.monthly_enrichment_limit > 0
      ? Math.round((currentUsage / config.monthly_enrichment_limit) * 100)
      : null;

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings2 className="size-4 text-violet-400" />
          <CardTitle>Budget Settings</CardTitle>
        </div>
        <CardDescription>
          Configure your monthly enrichment limits and alert thresholds.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {/* Monthly limit */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-muted-foreground">
            Monthly enrichment limit
          </label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="size-8 p-0"
              onClick={() =>
                setConfig((c) => ({
                  ...c,
                  monthly_enrichment_limit: Math.max(
                    0,
                    c.monthly_enrichment_limit - 100
                  ),
                }))
              }
            >
              −
            </Button>
            <Input
              type="number"
              min={0}
              step={50}
              value={config.monthly_enrichment_limit}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  monthly_enrichment_limit:
                    parseInt(e.target.value, 10) || 0,
                }))
              }
              className="w-28 text-center"
            />
            <Button
              variant="outline"
              size="sm"
              className="size-8 p-0"
              onClick={() =>
                setConfig((c) => ({
                  ...c,
                  monthly_enrichment_limit:
                    c.monthly_enrichment_limit + 100,
                }))
              }
            >
              +
            </Button>
            <span className="text-xs text-muted-foreground">
              enrichments / month
            </span>
          </div>
          {usagePct !== null && (
            <p className="text-xs text-muted-foreground">
              Current usage: {currentUsage} / {config.monthly_enrichment_limit}{" "}
              ({usagePct}%)
            </p>
          )}
        </div>

        {/* Alert threshold */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-muted-foreground">
            Alert threshold: {config.alert_threshold_pct}%
          </label>
          <Slider
            value={[config.alert_threshold_pct]}
            onValueChange={([v]) =>
              setConfig((c) => ({ ...c, alert_threshold_pct: v }))
            }
            min={0}
            max={100}
            step={5}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            You will be warned when usage exceeds this threshold.
          </p>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="gap-1.5"
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : saved ? (
              <Check className="size-3.5" />
            ) : null}
            {saved ? "Saved" : "Save"}
          </Button>
          <button
            onClick={handleReset}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            <RotateCcw className="size-3" />
            Reset to defaults
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
