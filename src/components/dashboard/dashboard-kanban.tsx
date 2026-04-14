"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CalendarIcon, AlertCircle, Filter, Check } from "lucide-react";
import { WorkspaceLogo } from "@/components/workspace/workspace-logo";
import { TaskDialog } from "@/components/project/task-dialog";
import type { WorkspaceWithMeta } from "@/lib/types/dashboard";
import type { Task, TaskStatus } from "@/lib/types/project";

type DashboardTask = {
  id: string;
  workspace_id: string;
  workspace_name: string;
  workspace_slug: string;
  workspace_color: string;
  workspace_logo_url: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: "urgent" | "normal" | "low";
  tag: string | null;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
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
  strategy: "#8a6e4e",
  admin: "#f59e0b",
};

export function DashboardKanban({
  workspaces,
}: {
  workspaces: WorkspaceWithMeta[];
}) {
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<Set<string>>(
    new Set()
  );

  // Task dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<DashboardTask | null>(null);

  const toggleWorkspace = (id: string) => {
    setSelectedWorkspaceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredTasks = useMemo(() => {
    if (selectedWorkspaceIds.size === 0) return tasks;
    return tasks.filter((t) => selectedWorkspaceIds.has(t.workspace_id));
  }, [tasks, selectedWorkspaceIds]);

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
              workspace_logo_url: ws.logo_url,
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

  // Drag and drop handler
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination, draggableId } = result;
      if (!destination) return;
      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      )
        return;

      const destStatus = destination.droppableId as TaskStatus;
      const draggedTask = tasks.find((t) => t.id === draggableId);
      if (!draggedTask) return;

      // Optimistic update: change task status in local state
      setTasks((prev) =>
        prev.map((t) =>
          t.id === draggableId ? { ...t, status: destStatus } : t
        )
      );

      // Persist via API — update status
      fetch(`/api/project/tasks/${draggableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: destStatus }),
      }).catch(() => {
        // Revert on failure
        setTasks((prev) =>
          prev.map((t) =>
            t.id === draggableId ? { ...t, status: draggedTask.status } : t
          )
        );
      });
    },
    [tasks]
  );

  // Convert DashboardTask to Task for the dialog
  const taskForDialog: Task | undefined = selectedTask
    ? {
        id: selectedTask.id,
        workspace_id: selectedTask.workspace_id,
        title: selectedTask.title,
        description: selectedTask.description,
        status: selectedTask.status,
        priority: selectedTask.priority,
        tag: selectedTask.tag as Task["tag"],
        due_date: selectedTask.due_date,
        position: selectedTask.position ?? 0,
        created_at: selectedTask.created_at ?? "",
        updated_at: selectedTask.updated_at ?? "",
      }
    : undefined;

  const handleCardClick = (task: DashboardTask) => {
    setSelectedTask(task);
    setDialogOpen(true);
  };

  const handleTaskSaved = () => {
    fetchAllTasks();
  };

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
    <div className="space-y-3">
      {/* Workspace filter */}
      {workspaces.length > 1 && (
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
                <Filter className="size-3" />
                Workspaces
                {selectedWorkspaceIds.size > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-1">
                    {selectedWorkspaceIds.size}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[200px] p-1">
              {workspaces.map((ws) => {
                const isSelected = selectedWorkspaceIds.has(ws.id);
                return (
                  <button
                    key={ws.id}
                    onClick={() => toggleWorkspace(ws.id)}
                    className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs hover:bg-accent transition-colors"
                  >
                    <div className={`size-4 rounded border flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-amber-700 border-amber-700" : "border-border"
                    }`}>
                      {isSelected && <Check className="size-3 text-white" />}
                    </div>
                    <WorkspaceLogo
                      logoUrl={ws.logo_url}
                      color={ws.color}
                      name={ws.name}
                      size="xs"
                    />
                    <span className="truncate">{ws.name}</span>
                  </button>
                );
              })}
              {selectedWorkspaceIds.size > 0 && (
                <button
                  onClick={() => setSelectedWorkspaceIds(new Set())}
                  className="w-full text-center text-[10px] text-muted-foreground hover:text-foreground py-1.5 border-t border-border mt-1"
                >
                  Réinitialiser
                </button>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {COLUMNS.map((col) => {
            const columnTasks = filteredTasks
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

                {/* Droppable column */}
                <Droppable droppableId={col.status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex flex-col gap-1.5 min-h-[100px] rounded-lg p-1 transition-colors ${
                        snapshot.isDraggingOver ? "bg-amber-700/10" : ""
                      }`}
                    >
                      {columnTasks.length === 0 && !snapshot.isDraggingOver ? (
                        <div className="rounded-lg border border-dashed border-border/50 px-3 py-6 text-center text-xs text-muted-foreground">
                          Aucune tâche
                        </div>
                      ) : (
                        columnTasks.map((task, index) => (
                          <Draggable
                            key={task.id}
                            draggableId={task.id}
                            index={index}
                          >
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                onClick={() => handleCardClick(task)}
                                className={`group rounded-lg border border-border/50 bg-card px-3 py-2 cursor-pointer hover:border-amber-700/30 transition-all ${
                                  dragSnapshot.isDragging
                                    ? "shadow-lg ring-1 ring-amber-700/30 rotate-1 scale-[1.02]"
                                    : ""
                                }`}
                              >
                                {/* Workspace badge */}
                                <div className="flex items-center gap-1.5 mb-1">
                                  <WorkspaceLogo
                                    logoUrl={task.workspace_logo_url}
                                    color={task.workspace_color}
                                    name={task.workspace_name}
                                    size="xs"
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
                                  <span
                                    className="size-1.5 rounded-full shrink-0"
                                    style={{
                                      backgroundColor:
                                        PRIORITY_COLORS[task.priority],
                                    }}
                                  />

                                  {task.tag && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[9px] px-1 py-0"
                                      style={{
                                        color:
                                          TAG_COLORS[task.tag] ?? "#6b7280",
                                        backgroundColor: `${TAG_COLORS[task.tag] ?? "#6b7280"}15`,
                                      }}
                                    >
                                      {task.tag}
                                    </Badge>
                                  )}

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
                                      {new Date(
                                        task.due_date
                                      ).toLocaleDateString("fr-FR", {
                                        day: "numeric",
                                        month: "short",
                                      })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Task edit dialog */}
      {selectedTask && (
        <TaskDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setSelectedTask(null);
          }}
          task={taskForDialog}
          workspaceId={selectedTask.workspace_id}
          onSaved={handleTaskSaved}
        />
      )}
    </div>
  );
}
