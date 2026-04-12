"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
  type DashboardFilters,
  type WorkspaceStatus,
  type WorkspacePriority,
} from "@/lib/types/dashboard";

type Props = {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  totalCount: number;
  filteredCount: number;
};

export function DashboardFiltersBar({
  filters,
  onFiltersChange,
  totalCount,
  filteredCount,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={filters.status}
        onValueChange={(v) =>
          onFiltersChange({
            ...filters,
            status: v as WorkspaceStatus | "all",
          })
        }
      >
        <SelectTrigger size="sm" className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
          {(Object.keys(STATUS_LABELS) as WorkspaceStatus[]).map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.priority}
        onValueChange={(v) =>
          onFiltersChange({
            ...filters,
            priority: v as WorkspacePriority | "all",
          })
        }
      >
        <SelectTrigger size="sm" className="w-[140px]">
          <SelectValue placeholder="Priorite" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes priorites</SelectItem>
          {(Object.keys(PRIORITY_LABELS) as WorkspacePriority[]).map((p) => (
            <SelectItem key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="ml-auto text-xs text-muted-foreground">
        {filteredCount === totalCount
          ? `${totalCount} workspace${totalCount !== 1 ? "s" : ""}`
          : `${filteredCount} / ${totalCount} workspace${totalCount !== 1 ? "s" : ""}`}
      </span>
    </div>
  );
}
