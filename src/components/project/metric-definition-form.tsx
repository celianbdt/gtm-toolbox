"use client";

import { useCallback, useEffect, useState } from "react";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type MetricDefinition = {
  id: string;
  workspace_id: string;
  metric_name: string;
  label: string;
  unit?: string | null;
  created_at: string;
};

const PRESETS = [
  { label: "Comptes enrichis", metric_name: "accounts_enriched" },
  { label: "Messages envoyes", metric_name: "messages_sent" },
  { label: "Meetings bookes", metric_name: "meetings_booked" },
  { label: "Reponses recues", metric_name: "replies_received" },
  { label: "Deals crees", metric_name: "deals_created" },
] as const;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function MetricDefinitionForm() {
  const workspace = useWorkspace();
  const [definitions, setDefinitions] = useState<MetricDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  // Form state
  const [label, setLabel] = useState("");
  const [metricName, setMetricName] = useState("");
  const [unit, setUnit] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDefinitions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/project/metrics/definitions?workspace_id=${workspace.id}`
      );
      if (res.ok) {
        const data: MetricDefinition[] = await res.json();
        setDefinitions(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [workspace.id]);

  useEffect(() => {
    fetchDefinitions();
  }, [fetchDefinitions]);

  // Auto-slugify label into metric_name
  useEffect(() => {
    setMetricName(slugify(label));
  }, [label]);

  const handleAdd = async () => {
    if (!label.trim() || !metricName.trim()) return;

    setAdding(true);
    try {
      const res = await fetch("/api/project/metrics/definitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspace.id,
          metric_name: metricName,
          label: label.trim(),
          unit: unit.trim() || undefined,
        }),
      });

      if (res.ok) {
        setLabel("");
        setMetricName("");
        setUnit("");
        await fetchDefinitions();
      }
    } catch {
      // silently fail
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(
        `/api/project/metrics/definitions?id=${id}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setDefinitions((prev) => prev.filter((d) => d.id !== id));
      }
    } catch {
      // silently fail
    } finally {
      setDeletingId(null);
    }
  };

  const handlePreset = (preset: (typeof PRESETS)[number]) => {
    const exists = definitions.some(
      (d) => d.metric_name === preset.metric_name
    );
    if (exists) return;

    setLabel(preset.label);
    setMetricName(preset.metric_name);
    setUnit("");
  };

  const availablePresets = PRESETS.filter(
    (p) => !definitions.some((d) => d.metric_name === p.metric_name)
  );

  return (
    <Card size="sm">
      <CardHeader>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-left w-full"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className={`shrink-0 transition-transform ${
              expanded ? "rotate-90" : ""
            }`}
          >
            <path
              d="M6 4L10 8L6 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <CardTitle>Configuration des metriques</CardTitle>
        </button>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {/* Existing definitions */}
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : definitions.length > 0 ? (
            <div className="space-y-2">
              {definitions.map((def) => (
                <div
                  key={def.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <span className="text-sm">{def.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({def.metric_name})
                    </span>
                    {def.unit && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        · {def.unit}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="icon-xs"
                    onClick={() => handleDelete(def.id)}
                    disabled={deletingId === def.id}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path
                        d="M3 3L9 9M9 3L3 9"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucune metrique configuree.
            </p>
          )}

          <Separator />

          {/* Preset chips */}
          {availablePresets.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Ajout rapide :</p>
              <div className="flex flex-wrap gap-1.5">
                {availablePresets.map((preset) => (
                  <Badge
                    key={preset.metric_name}
                    variant="outline"
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => handlePreset(preset)}
                  >
                    + {preset.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Add form */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">
              Ajouter une metrique
            </p>
            <div className="flex items-end gap-2 flex-wrap">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Label</label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ex: Meetings bookes"
                  className="w-[180px]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Slug</label>
                <Input
                  value={metricName}
                  onChange={(e) => setMetricName(e.target.value)}
                  placeholder="meetings_booked"
                  className="w-[160px]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Unite (opt.)
                </label>
                <Input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="Ex: %"
                  className="w-[80px]"
                />
              </div>
              <Button
                onClick={handleAdd}
                disabled={adding || !label.trim() || !metricName.trim()}
                size="sm"
              >
                {adding ? "..." : "Ajouter"}
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
