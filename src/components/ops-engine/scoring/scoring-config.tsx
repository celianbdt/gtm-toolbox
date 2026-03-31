"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Save, Loader2 } from "lucide-react";
import type {
  ScoringConfig,
  ScoringRule,
  OpsColumn,
  ThresholdTier,
} from "@/lib/ops-engine/types";
import { TIER_LABELS, TIER_COLORS } from "@/lib/ops-engine/types";
import { ScoreRuleRow } from "./score-rule-row";

function newRule(): ScoringRule {
  return {
    id: crypto.randomUUID(),
    label: "",
    column_key: "",
    operator: "is_not_empty",
    value: "",
    score_impact: 10,
  };
}

export function ScoringConfigPanel({
  tableId,
}: {
  tableId: string;
}) {
  const [config, setConfig] = useState<ScoringConfig | null>(null);
  const [columns, setColumns] = useState<OpsColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [scoringRes, colRes] = await Promise.all([
        fetch(`/api/ops-engine/tables/${tableId}/scoring`),
        fetch(`/api/ops-engine/tables/${tableId}/columns`),
      ]);
      if (scoringRes.ok) {
        const d = await scoringRes.json();
        setConfig(d.scoring_config);
      }
      if (colRes.ok) {
        const d = await colRes.json();
        setColumns(d.columns ?? []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    try {
      await fetch(`/api/ops-engine/tables/${tableId}/scoring`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function updateRule(index: number, updated: ScoringRule) {
    if (!config) return;
    const rules = [...config.rules];
    rules[index] = updated;
    setConfig({ ...config, rules });
  }

  function deleteRule(index: number) {
    if (!config) return;
    const rules = config.rules.filter((_, i) => i !== index);
    setConfig({ ...config, rules });
  }

  function addRule() {
    if (!config) return;
    setConfig({ ...config, rules: [...config.rules, newRule()] });
  }

  function updateThreshold(tier: ThresholdTier, value: number) {
    if (!config) return;
    setConfig({
      ...config,
      thresholds: { ...config.thresholds, [tier]: value },
    });
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!config) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        No scoring config found.
      </p>
    );
  }

  const thresholdTiers: ThresholdTier[] = [
    "ignored",
    "cold",
    "warm",
    "hot",
    "priority",
  ];

  return (
    <div className="flex flex-col gap-6 p-6 overflow-y-auto flex-1">
      {/* Rules */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Scoring Rules</h3>
          <Button variant="outline" size="sm" onClick={addRule}>
            <Plus className="size-3" />
            Add Rule
          </Button>
        </div>
        {config.rules.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No rules yet. Add a rule to start scoring.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {config.rules.map((rule, i) => (
              <ScoreRuleRow
                key={rule.id}
                rule={rule}
                columns={columns}
                onChange={(r) => updateRule(i, r)}
                onDelete={() => deleteRule(i)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thresholds */}
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-medium">Tier Thresholds</h3>
        <div className="flex flex-col gap-3">
          {thresholdTiers.map((tier) => (
            <div key={tier} className="flex items-center gap-3">
              <span
                className="w-16 text-xs font-medium"
                style={{ color: TIER_COLORS[tier] }}
              >
                {TIER_LABELS[tier]}
              </span>
              <Slider
                min={0}
                max={100}
                step={1}
                value={[config.thresholds[tier]]}
                onValueChange={([v]) => updateThreshold(tier, v)}
                className="flex-1"
              />
              <span className="w-8 text-xs text-muted-foreground text-right font-mono">
                {config.thresholds[tier]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save scoring
        </Button>
      </div>
    </div>
  );
}
