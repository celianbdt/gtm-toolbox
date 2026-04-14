"use client";

import { Droppable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { KanbanCard } from "./kanban-card";
import {
  type Task,
  type TaskStatus,
  TASK_STATUS_LABELS,
} from "@/lib/types/project";

type KanbanColumnProps = {
  status: TaskStatus;
  tasks: Task[];
  onCardClick: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
};

const COLUMN_BG: Record<TaskStatus, string> = {
  todo: "bg-muted/20",
  in_progress: "bg-amber-700/5",
  blocked: "bg-red-500/8",
  done: "bg-emerald-500/5",
};

const COLUMN_HEADER_COLOR: Record<TaskStatus, string> = {
  todo: "text-muted-foreground",
  in_progress: "text-amber-600",
  blocked: "text-red-400",
  done: "text-emerald-400",
};

export function KanbanColumn({
  status,
  tasks,
  onCardClick,
  onAddTask,
}: KanbanColumnProps) {
  return (
    <div
      className={`flex flex-col rounded-lg ${COLUMN_BG[status]} min-h-[300px] flex-1 min-w-[260px]`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/30">
        <div className="flex items-center gap-2">
          <h3
            className={`text-xs font-semibold uppercase tracking-wider ${COLUMN_HEADER_COLOR[status]}`}
          >
            {TASK_STATUS_LABELS[status]}
          </h3>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
            {tasks.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => onAddTask(status)}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      {/* Droppable area */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-2 flex flex-col gap-2 transition-colors ${
              snapshot.isDraggingOver ? "bg-amber-700/10" : ""
            }`}
          >
            {tasks.map((task, index) => (
              <KanbanCard
                key={task.id}
                task={task}
                index={index}
                onClick={() => onCardClick(task)}
              />
            ))}
            {provided.placeholder}

            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-muted-foreground/50">
                  Aucune tache
                </p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
