"use client";

import { useCallback } from "react";
import {
  DragDropContext,
  type DropResult,
} from "@hello-pangea/dnd";
import { KanbanColumn } from "./kanban-column";
import {
  type Task,
  type TaskStatus,
  TASK_STATUS_ORDER,
} from "@/lib/types/project";

type KanbanBoardProps = {
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
  onCardClick: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
};

export function KanbanBoard({
  tasks,
  onTasksChange,
  onCardClick,
  onAddTask,
}: KanbanBoardProps) {
  const tasksByStatus = TASK_STATUS_ORDER.reduce(
    (acc, status) => {
      acc[status] = tasks
        .filter((t) => t.status === status)
        .sort((a, b) => a.position - b.position);
      return acc;
    },
    {} as Record<TaskStatus, Task[]>
  );

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination } = result;
      if (!destination) return;
      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      )
        return;

      const sourceStatus = source.droppableId as TaskStatus;
      const destStatus = destination.droppableId as TaskStatus;

      // Clone columns
      const sourceCol = [...tasksByStatus[sourceStatus]];
      const destCol =
        sourceStatus === destStatus
          ? sourceCol
          : [...tasksByStatus[destStatus]];

      // Remove from source
      const [moved] = sourceCol.splice(source.index, 1);
      if (!moved) return;

      // Update status if column changed
      const updatedTask = {
        ...moved,
        status: destStatus,
      };

      // Insert into destination
      if (sourceStatus === destStatus) {
        sourceCol.splice(destination.index, 0, updatedTask);
      } else {
        destCol.splice(destination.index, 0, updatedTask);
      }

      // Recompute positions
      const reposition = (col: Task[]) =>
        col.map((t, i) => ({ ...t, position: i }));

      const updatedTasks = tasks.map((t) => {
        // Find task in modified columns
        if (sourceStatus === destStatus) {
          const found = reposition(sourceCol).find((c) => c.id === t.id);
          if (found) return found;
        } else {
          const foundSrc = reposition(sourceCol).find((c) => c.id === t.id);
          if (foundSrc) return foundSrc;
          const foundDest = reposition(destCol).find((c) => c.id === t.id);
          if (foundDest) return foundDest;
        }
        return t;
      });

      // Optimistic update
      onTasksChange(updatedTasks);

      // Build reorder payload
      const affectedCol =
        sourceStatus === destStatus
          ? reposition(sourceCol)
          : [...reposition(sourceCol), ...reposition(destCol)];

      const reorderPayload = affectedCol.map((t) => ({
        id: t.id,
        status: t.status,
        position: t.position,
      }));

      fetch("/api/project/tasks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: reorderPayload }),
      }).catch(() => {
        // Revert on failure — refetch
        // (in production, we'd refetch tasks here)
      });
    },
    [tasks, tasksByStatus, onTasksChange]
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 flex-1 min-h-0 overflow-x-auto pb-2">
        {TASK_STATUS_ORDER.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasksByStatus[status]}
            onCardClick={onCardClick}
            onAddTask={onAddTask}
          />
        ))}
      </div>
    </DragDropContext>
  );
}
