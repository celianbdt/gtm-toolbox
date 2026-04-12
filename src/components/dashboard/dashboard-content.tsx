"use client";

import { useMemo, useState } from "react";
import type { DashboardFilters, WorkspaceWithMeta } from "@/lib/types/dashboard";
import { DashboardFiltersBar } from "./dashboard-filters";
import { DashboardTaskSummary } from "./dashboard-task-summary";
import { DashboardWorkspaceCard } from "./dashboard-workspace-card";

type Props = {
  workspaces: WorkspaceWithMeta[];
};

export function DashboardContent({ workspaces }: Props) {
  const [filters, setFilters] = useState<DashboardFilters>({
    status: "all",
    priority: "all",
  });

  const filtered = useMemo(() => {
    return workspaces.filter((ws) => {
      if (filters.status !== "all" && ws.status !== filters.status) return false;
      if (filters.priority !== "all" && ws.priority !== filters.priority)
        return false;
      return true;
    });
  }, [workspaces, filters]);

  return (
    <div className="space-y-6">
      {/* Blocked task summary */}
      <DashboardTaskSummary workspaces={workspaces} />

      {/* Filters */}
      <DashboardFiltersBar
        filters={filters}
        onFiltersChange={setFilters}
        totalCount={workspaces.length}
        filteredCount={filtered.length}
      />

      {/* Workspace grid */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Aucun workspace ne correspond aux filtres.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ws) => (
            <DashboardWorkspaceCard key={ws.id} workspace={ws} />
          ))}
        </div>
      )}
    </div>
  );
}
