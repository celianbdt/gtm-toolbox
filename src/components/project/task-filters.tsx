"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  TASK_TAG_LABELS,
  TASK_PRIORITY_COLORS,
  type TaskTag,
  type TaskPriority,
} from "@/lib/types/project";

export type Filters = {
  tag: TaskTag | "all";
  priority: TaskPriority | "all";
};

type TaskFiltersProps = {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
};

export function TaskFilters({ filters, onFiltersChange }: TaskFiltersProps) {
  const activeCount =
    (filters.tag !== "all" ? 1 : 0) + (filters.priority !== "all" ? 1 : 0);

  return (
    <div className="flex items-center gap-2">
      <Select
        value={filters.tag}
        onValueChange={(v) =>
          onFiltersChange({ ...filters, tag: v as TaskTag | "all" })
        }
      >
        <SelectTrigger size="sm" className="w-[130px]">
          <SelectValue placeholder="Tag" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les tags</SelectItem>
          {(Object.entries(TASK_TAG_LABELS) as [TaskTag, string][]).map(
            ([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            )
          )}
        </SelectContent>
      </Select>

      <Select
        value={filters.priority}
        onValueChange={(v) =>
          onFiltersChange({ ...filters, priority: v as TaskPriority | "all" })
        }
      >
        <SelectTrigger size="sm" className="w-[130px]">
          <SelectValue placeholder="Priorite" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes</SelectItem>
          {(
            Object.entries(TASK_PRIORITY_COLORS) as [TaskPriority, string][]
          ).map(([key, color]) => (
            <SelectItem key={key} value={key}>
              <span className="flex items-center gap-2">
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {activeCount > 0 && (
        <Badge variant="secondary" className="text-xs">
          {activeCount} filtre{activeCount > 1 ? "s" : ""}
        </Badge>
      )}
    </div>
  );
}
