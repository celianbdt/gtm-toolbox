"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  CalendarIcon,
  CheckCircle2Icon,
  CircleDotIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  WorkspaceStatusBadge,
  WorkspacePriorityBadge,
} from "./workspace-status-badge";
import { WorkspaceLogo } from "@/components/workspace/workspace-logo";
import { QuickReportButton } from "./quick-report-button";
import type {
  WorkspaceWithMeta,
  WorkspaceStatus,
  WorkspacePriority,
} from "@/lib/types/dashboard";
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
} from "@/lib/types/dashboard";

type Props = {
  workspace: WorkspaceWithMeta;
};

export function DashboardWorkspaceCard({ workspace: initial }: Props) {
  const [workspace, setWorkspace] = useState(initial);

  const updateField = async (
    field: "status" | "priority",
    value: WorkspaceStatus | WorkspacePriority
  ) => {
    // Optimistic update
    setWorkspace((prev) => ({ ...prev, [field]: value }));

    try {
      await fetch(`/api/dashboard/workspaces/${workspace.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
    } catch {
      // Revert on failure
      setWorkspace((prev) => ({ ...prev, [field]: initial[field] }));
    }
  };

  const updatedAt = new Date(workspace.updated_at);
  const relativeTime = getRelativeTime(updatedAt);

  return (
    <Card size="sm" className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/${workspace.slug}`}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0"
          >
            <WorkspaceLogo
              logoUrl={workspace.logo_url}
              color={workspace.color}
              name={workspace.name}
              size="sm"
            />
            <CardTitle className="truncate">{workspace.name}</CardTitle>
          </Link>
        </div>

        {/* Status & Priority badges with inline editing */}
        <div className="flex items-center gap-1.5 mt-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="cursor-pointer">
                <WorkspaceStatusBadge status={workspace.status} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[140px]">
              <DropdownMenuLabel>Statut</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(STATUS_LABELS) as WorkspaceStatus[]).map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => updateField("status", s)}
                >
                  {STATUS_LABELS[s]}
                  {s === workspace.status && (
                    <CheckCircle2Icon className="ml-auto size-3 text-muted-foreground" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="cursor-pointer">
                <WorkspacePriorityBadge priority={workspace.priority} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[140px]">
              <DropdownMenuLabel>Priorite</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(PRIORITY_LABELS) as WorkspacePriority[]).map(
                (p) => (
                  <DropdownMenuItem
                    key={p}
                    onClick={() => updateField("priority", p)}
                  >
                    {PRIORITY_LABELS[p]}
                    {p === workspace.priority && (
                      <CheckCircle2Icon className="ml-auto size-3 text-muted-foreground" />
                    )}
                  </DropdownMenuItem>
                )
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {/* Metrics row */}
        {workspace.metrics.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {workspace.metrics.slice(0, 4).map((m) => (
              <div key={m.metric_name} className="rounded-md bg-muted/50 p-2">
                <div className="text-xs text-muted-foreground truncate">
                  {m.label}
                </div>
                <div className="text-sm font-semibold">
                  {m.value}
                  {m.unit && (
                    <span className="text-xs font-normal text-muted-foreground ml-0.5">
                      {m.unit}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Task summary mini bar */}
        {workspace.task_summary.total > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CircleDotIcon className="size-3" />
            <span>
              {workspace.task_summary.done_this_week} done cette semaine
            </span>
            <span className="text-foreground/30">|</span>
            <span>{workspace.task_summary.total} total</span>
            {workspace.task_summary.blocked > 0 && (
              <>
                <span className="text-foreground/30">|</span>
                <span className="text-amber-400">
                  {workspace.task_summary.blocked} bloquee
                  {workspace.task_summary.blocked !== 1 ? "s" : ""}
                </span>
              </>
            )}
          </div>
        )}

        {/* Next action */}
        {workspace.next_task && (
          <div className="rounded-md border border-border/50 bg-violet-500/5 px-2.5 py-1.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
              Prochaine action
            </div>
            <div className="text-xs font-medium truncate">
              {workspace.next_task.title}
            </div>
            {workspace.next_task.due_date && (
              <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
                <CalendarIcon className="size-2.5" />
                {new Date(workspace.next_task.due_date).toLocaleDateString(
                  "fr-FR",
                  { day: "numeric", month: "short" }
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-border/50 pt-3">
        <span className="text-[10px] text-muted-foreground" suppressHydrationWarning>{relativeTime}</span>
        <div className="flex items-center gap-1">
          <QuickReportButton workspaceSlug={workspace.slug} />
          <Button variant="ghost" size="xs" asChild>
            <Link href={`/${workspace.slug}`}>
              Ouvrir
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "A l'instant";
  if (diffMins < 60) return `Il y a ${diffMins}min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
