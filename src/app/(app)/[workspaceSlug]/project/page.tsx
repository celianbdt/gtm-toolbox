"use client";

import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { KanbanBoard } from "@/components/project/kanban-board";
import { TaskListView } from "@/components/project/task-list-view";
import { TaskDialog } from "@/components/project/task-dialog";
import { TaskFilters, type Filters } from "@/components/project/task-filters";
import { ViewToggle, type ViewMode } from "@/components/project/view-toggle";
import { MetricsForm } from "@/components/project/metrics-form";
import { MetricsSparklines } from "@/components/project/metrics-sparklines";
import { MetricDefinitionForm } from "@/components/project/metric-definition-form";
import { ReportGenerator } from "@/components/project/report-generator";
import { ReportHistory } from "@/components/project/report-history";
import type { Task, TaskStatus } from "@/lib/types/project";

export default function ProjectPage() {
  const workspace = useWorkspace();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("kanban");
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [filters, setFilters] = useState<Filters>({ tag: "all", priority: "all" });

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("todo");

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/project/tasks?workspace_id=${workspace.id}`
      );
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks ?? data);
      }
    } finally {
      setLoading(false);
    }
  }, [workspace.id]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Apply filters
  const filteredTasks = tasks.filter((t) => {
    if (filters.tag !== "all" && t.tag !== filters.tag) return false;
    if (filters.priority !== "all" && t.priority !== filters.priority)
      return false;
    return true;
  });

  const handleCardClick = (task: Task) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  const handleAddTask = (status?: TaskStatus) => {
    setEditingTask(undefined);
    setDefaultStatus(status ?? "todo");
    setDialogOpen(true);
  };

  const handleSaved = () => {
    fetchTasks();
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
        <h1 className="text-lg font-semibold">Project</h1>
        <div className="flex items-center gap-3">
          {activeTab === "kanban" && (
            <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          )}
          <TaskFilters filters={filters} onFiltersChange={setFilters} />
          <Button size="sm" onClick={() => handleAddTask()}>
            <Plus className="size-4 mr-1" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col flex-1 min-h-0"
      >
        <div className="shrink-0 px-4 pt-2">
          <TabsList>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="kanban" className="flex-1 min-h-0 px-4 py-3">
          {loading ? (
            <div className="flex gap-3 h-full">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex-1 flex flex-col gap-2">
                  <Skeleton className="h-8 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                </div>
              ))}
            </div>
          ) : viewMode === "kanban" ? (
            <KanbanBoard
              tasks={filteredTasks}
              onTasksChange={setTasks}
              onCardClick={handleCardClick}
              onAddTask={handleAddTask}
            />
          ) : (
            <TaskListView
              tasks={filteredTasks}
              onCardClick={handleCardClick}
            />
          )}
        </TabsContent>

        <TabsContent value="metrics" className="flex-1 min-h-0 px-4 py-3 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-8">
            <MetricsSparklines />
            <MetricsForm />
            <MetricDefinitionForm />
          </div>
        </TabsContent>

        <TabsContent value="reports" className="flex-1 min-h-0 px-4 py-3 overflow-y-auto">
          <div className="max-w-3xl mx-auto space-y-8">
            <ReportGenerator />
            <ReportHistory />
          </div>
        </TabsContent>
      </Tabs>

      {/* Task Dialog */}
      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editingTask}
        defaultStatus={defaultStatus}
        workspaceId={workspace.id}
        onSaved={handleSaved}
      />
    </div>
  );
}
