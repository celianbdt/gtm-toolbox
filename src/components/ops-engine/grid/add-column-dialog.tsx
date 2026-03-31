"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, GripVertical, Plus, Trash2 } from "lucide-react";
import type {
  OpsColumnType,
  SignalSource,
  EnricherProvider,
  WaterfallStep,
  ColumnConfig,
} from "@/lib/ops-engine/types";
import { SIGNAL_LABELS, ENRICHER_LABELS } from "@/lib/ops-engine/types";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

const COLUMN_TYPES: { value: OpsColumnType; label: string }[] = [
  { value: "signal_input", label: "Signal Input" },
  { value: "enricher", label: "Enricher" },
  { value: "ai_column", label: "AI Column" },
  { value: "formula", label: "Formula" },
  { value: "static", label: "Static" },
];

export function AddColumnDialog({
  open,
  onOpenChange,
  tableId,
  onColumnCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string;
  onColumnCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyManual, setKeyManual] = useState(false);
  const [columnType, setColumnType] = useState<OpsColumnType>("static");
  const [saving, setSaving] = useState(false);

  // Signal config
  const [signalSource, setSignalSource] = useState<SignalSource>("manual");

  // Enricher config
  const [waterfall, setWaterfall] = useState<WaterfallStep[]>([]);

  // AI column config
  const [aiPrompt, setAiPrompt] = useState("");

  // Formula config
  const [formulaExpr, setFormulaExpr] = useState("");

  function handleNameChange(v: string) {
    setName(v);
    if (!keyManual) setKey(slugify(v));
  }

  function buildConfig(): ColumnConfig {
    switch (columnType) {
      case "signal_input":
        return { source: signalSource, filters: {} };
      case "enricher":
        return { waterfall, cache_ttl_days: 30 };
      case "ai_column":
        return { prompt: aiPrompt, model: "gpt-4o-mini", output_type: "text" as const };
      case "formula":
        return { expression: formulaExpr, output_type: "text" as const };
      default:
        return {};
    }
  }

  async function handleSubmit() {
    if (!name.trim() || !key.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/ops-engine/tables/${tableId}/columns`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            key: key.trim(),
            column_type: columnType,
            config: buildConfig(),
            is_visible: true,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to create column");
      onColumnCreated();
      resetForm();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setName("");
    setKey("");
    setKeyManual(false);
    setColumnType("static");
    setSignalSource("manual");
    setWaterfall([]);
    setAiPrompt("");
    setFormulaExpr("");
  }

  function addWaterfallStep() {
    setWaterfall((prev) => [
      ...prev,
      { provider: "apollo" as EnricherProvider, fields: [] },
    ]);
  }

  function removeWaterfallStep(i: number) {
    setWaterfall((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateWaterfallProvider(i: number, provider: EnricherProvider) {
    setWaterfall((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, provider } : s))
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Column</DialogTitle>
          <DialogDescription>
            Configure a new column for your table.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Name
            </label>
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Column name"
              className="h-8 text-sm"
            />
          </div>

          {/* Key */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Key
            </label>
            <Input
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setKeyManual(true);
              }}
              placeholder="column_key"
              className="h-8 text-sm font-mono"
            />
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Type
            </label>
            <Select
              value={columnType}
              onValueChange={(v) => setColumnType(v as OpsColumnType)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLUMN_TYPES.map((ct) => (
                  <SelectItem key={ct.value} value={ct.value}>
                    {ct.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic config */}
          {columnType === "signal_input" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Source
              </label>
              <Select
                value={signalSource}
                onValueChange={(v) => setSignalSource(v as SignalSource)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(SIGNAL_LABELS) as [SignalSource, string][]
                  ).map(([val, lbl]) => (
                    <SelectItem key={val} value={val}>
                      {lbl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {columnType === "enricher" && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">
                  Waterfall
                </label>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={addWaterfallStep}
                >
                  <Plus className="size-3" />
                  Add provider
                </Button>
              </div>
              {waterfall.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No providers. Add at least one.
                </p>
              )}
              {waterfall.map((step, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5"
                >
                  <GripVertical className="size-3 text-muted-foreground cursor-grab" />
                  <span className="text-xs text-muted-foreground w-4">
                    {i + 1}
                  </span>
                  <Select
                    value={step.provider}
                    onValueChange={(v) =>
                      updateWaterfallProvider(i, v as EnricherProvider)
                    }
                  >
                    <SelectTrigger className="h-7 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        Object.entries(ENRICHER_LABELS) as [
                          EnricherProvider,
                          string,
                        ][]
                      ).map(([val, lbl]) => (
                        <SelectItem key={val} value={val}>
                          {lbl}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeWaterfallStep(i)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {columnType === "ai_column" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Prompt
              </label>
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Analyze {company_name} and determine..."
                className="text-sm min-h-20"
              />
              <p className="text-[10px] text-muted-foreground">
                Use {"{column_key}"} syntax to reference other columns.
              </p>
            </div>
          )}

          {columnType === "formula" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Expression
              </label>
              <Input
                value={formulaExpr}
                onChange={(e) => setFormulaExpr(e.target.value)}
                placeholder="funding_amount * 0.1 + employee_count"
                className="h-8 text-sm font-mono"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Add Column
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
