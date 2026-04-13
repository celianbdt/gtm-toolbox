"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon, AlertCircle } from "lucide-react";
import type { WorkspaceWithMeta } from "@/lib/types/dashboard";

type TaskStatus = "todo" | "in_progress" | "blocked" | "done";

type DashboardTask = {
  id: string;
  workspace_id: string;
  workspace_name: string;
  workspace_slug: string;
  workspace_color: string;
  title: string;
  status: TaskStatus;
  priority: "urgent" | "normal" | "low";
  tag: string | null;
  due_date: string | null;
};

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: "todo", label: "À faire", color: "#6b7280" },
  { status: "in_progress", label: "En cours", color: "#3b82f6" },
  { status: "blocked", label: "Bloqué", color: "#ef4444" },
  { status: "done", label: "Fait", color: "#10b981" },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  normal: "#3b82f6",
  low: "#6b7280",
};

const TAG_COLORS: Record<string, string> = {
  outbound: "#10b981",
  inbound: "#3b82f6",
  strategy: "#8b5cf6",
  admin: "#f59e0b",
};

export function DashboardKanban({
  workspaces,
}: {
  workspaces: WorkspaceWithMeta[];
}) {
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllTasks = useCallback(async () => {
    setLoading(true);
    const allTasks: DashboardTask[] = [];

    await Promise.allSettled(
      workspaces.map(async (ws) => {
        try {
          const res = await fetch(
            `/api/project/tasks?workspace_id=${ws.id}`
          );
          if (!res.ok) return;
          const data = await res.json();
          const wsTasks = (data.tasks ?? []).map(
            (t: Record<string, unknown>) => ({
              ...t,
              workspace_id: ws.id,
              workspace_name: ws.name,
              workspace_slug: ws.slug,
              workspace_color: ws.color,
            })
          );
          allTasks.push(...wsTasks);
        } catch {
          // skip workspace on error
        }
      })
    );

    setTasks(allTasks);
    setLoading(false);
  }, [workspaces]);

  useEffect(() => {
    if (workspaces.length > 0) fetchAllTasks();
  }, [fetchAllTasks, workspaces.length]);

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-3">
        {COLUMNS.map((col) => (
          <div key={col.status} className="space-y-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
      {COLUMNS.map((col) => {
        const columnTasks = tasks
          .filter((t) => t.status === col.status)
          .sort((a, b) => {
            const pOrder = { urgent: 0, normal: 1, low: 2 };
            return (
              pOrder[a.priority as keyof typeof pOrder] -
              pOrder[b.priority as keyof typeof pOrder]
            );
          });

        return (
          <div key={col.status} className="flex flex-col gap-2">
            {/* Column header */}
            <div className="flex items-center gap-2 px-1 py-1">
              <div
                className="size-2 rounded-full"
                style={{ backgroundColor: col.color }}
              />
              <span className="text-xs font-medium">{col.label}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5">
                {columnTasks.length}
              </Badge>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-1.5 min-h-[100px]">
              {columnTasks.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/50 px-3 py-6 text-center text-xs text-muted-foreground">
                  Aucune tâche
                </div>
              ) : (
                columnTasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/${task.workspace_slug}/project`}
                    className="group rounded-lg border border-border/50 bg-card px-3 py-2 hover:border-violet-500/30 transition-colors"
                  >
                    {/* Workspace badge */}
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className="size-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: task.workspace_color }}
                      />
                      <span className="text-[10px] text-muted-foreground truncate">
                        {task.workspace_name}
                      </span>
                    </div>

                    {/* Title */}
                    <div className="text-xs font-medium truncate mb-1.5">
                      {task.title}
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Priority dot */}
                      <span
                        className="size-1.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: PRIORITY_COLORS[task.priority],
                        }}
                      />

                      {/* Tag */}
                      {task.tag && (
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1 py-0"
                          style={{
                            color: TAG_COLORS[task.tag] ?? "#6b7280",
                            backgroundColor: `${TAG_COLORS[task.tag] ?? "#6b7280"}15`,
                          }}
                        >
                          {task.tag}
                        </Badge>
                      )}

                      {/* Due date */}
                      {task.due_date && (
                        <span
                          className={`flex items-center gap-0.5 text-[10px] ${
                            new Date(task.due_date) < new Date()
                              ? "text-red-400"
                              : "text-muted-foreground"
                          }`}
                        >
                          {new Date(task.due_date) < new Date() ? (
                            <AlertCircle className="size-2.5" />
                          ) : (
                            <CalendarIcon className="size-2.5" />
                          )}
                          {new Date(task.due_date).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
