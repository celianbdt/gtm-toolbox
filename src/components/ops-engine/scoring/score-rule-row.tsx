"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import type {
  ScoringRule,
  ScoringOperator,
  OpsColumn,
} from "@/lib/ops-engine/types";

const OPERATORS: { value: ScoringOperator; label: string }[] = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "not equals" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "not contains" },
  { value: "greater_than", label: ">" },
  { value: "less_than", label: "<" },
  { value: "within_days", label: "within days" },
  { value: "matches_list", label: "in list" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
  { value: "ai_evaluation", label: "AI eval" },
];

const NO_VALUE_OPS: ScoringOperator[] = ["is_empty", "is_not_empty"];

export function ScoreRuleRow({
  rule,
  columns,
  onChange,
  onDelete,
}: {
  rule: ScoringRule;
  columns: OpsColumn[];
  onChange: (updated: ScoringRule) => void;
  onDelete: () => void;
}) {
  const needsValue = !NO_VALUE_OPS.includes(rule.operator);

  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
      {/* Label */}
      <Input
        value={rule.label}
        onChange={(e) => onChange({ ...rule, label: e.target.value })}
        placeholder="Rule label"
        className="h-8 w-32 text-xs"
      />

      {/* Column */}
      <Select
        value={rule.column_key}
        onValueChange={(v) => onChange({ ...rule, column_key: v })}
      >
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue placeholder="Column" />
        </SelectTrigger>
        <SelectContent>
          {columns.map((c) => (
            <SelectItem key={c.key} value={c.key}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Operator */}
      <Select
        value={rule.operator}
        onValueChange={(v) =>
          onChange({ ...rule, operator: v as ScoringOperator })
        }
      >
        <SelectTrigger className="h-8 w-28 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPERATORS.map((op) => (
            <SelectItem key={op.value} value={op.value}>
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value */}
      {needsValue && (
        <Input
          value={String(rule.value ?? "")}
          onChange={(e) => onChange({ ...rule, value: e.target.value })}
          placeholder="Value"
          className="h-8 w-28 text-xs"
        />
      )}

      {/* Impact */}
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={rule.score_impact}
          onChange={(e) =>
            onChange({ ...rule, score_impact: Number(e.target.value) })
          }
          className="h-8 w-16 text-xs text-center"
        />
        <span className="text-xs text-muted-foreground">pts</span>
      </div>

      {/* Delete */}
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={onDelete}
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="size-3" />
      </Button>
    </div>
  );
}
