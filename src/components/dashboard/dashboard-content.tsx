"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileBarChart } from "lucide-react";
import type { DashboardFilters, WorkspaceWithMeta } from "@/lib/types/dashboard";
import { DashboardFiltersBar } from "./dashboard-filters";
import { DashboardTaskSummary } from "./dashboard-task-summary";
import { DashboardWorkspaceCard } from "./dashboard-workspace-card";
import { DashboardKanban } from "./dashboard-kanban";

type Props = {
  workspaces: WorkspaceWithMeta[];
};

type ViewMode = "workspaces" | "kanban";

export function DashboardContent({ workspaces }: Props) {
  const [filters, setFilters] = useState<DashboardFilters>({
    status: "all",
    priority: "all",
  });
  const [viewMode, setViewMode] = useState<ViewMode>("workspaces");

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

      {/* View toggle + Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
          <button
            onClick={() => setViewMode("workspaces")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              viewMode === "workspaces"
                ? "bg-violet-500/10 text-violet-400"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Workspaces
          </button>
          <button
            onClick={() => setViewMode("kanban")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              viewMode === "kanban"
                ? "bg-violet-500/10 text-violet-400"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Kanban global
          </button>
        </div>

        <Link
          href="/workspaces/reports"
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md border border-border hover:border-violet-500/30 transition-colors text-muted-foreground hover:text-foreground"
        >
          <FileBarChart className="size-3" />
          Reports
        </Link>

        <DashboardFiltersBar
          filters={filters}
          onFiltersChange={setFilters}
          totalCount={workspaces.length}
          filteredCount={filtered.length}
        />
      </div>

      {viewMode === "workspaces" ? (
        filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Aucun workspace ne correspond aux filtres.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((ws) => (
              <DashboardWorkspaceCard key={ws.id} workspace={ws} />
            ))}
          </div>
        )
      ) : (
        <DashboardKanban workspaces={filtered} />
      )}
    </div>
  );
}
