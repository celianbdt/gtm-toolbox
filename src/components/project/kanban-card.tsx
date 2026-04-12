"use client";

import { Draggable } from "@hello-pangea/dnd";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  type Task,
  TASK_TAG_LABELS,
  TASK_TAG_COLORS,
  TASK_PRIORITY_COLORS,
} from "@/lib/types/project";
import { Calendar } from "lucide-react";

type KanbanCardProps = {
  task: Task;
  index: number;
  onClick: () => void;
};

export function KanbanCard({ task, index, onClick }: KanbanCardProps) {
  const isOverdue =
    task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
        >
          <Card
            className={`p-3 cursor-pointer border-border/50 bg-card hover:bg-muted/50 transition-all ${
              snapshot.isDragging
                ? "shadow-lg ring-1 ring-violet-500/30 rotate-1 scale-[1.02]"
                : ""
            }`}
          >
            <div className="flex flex-col gap-2">
              {/* Title */}
              <p className="text-sm font-medium leading-tight line-clamp-2">
                {task.title}
              </p>

              {/* Bottom row: tag + priority + due date */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {task.tag && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] h-4 px-1.5"
                    style={{
                      backgroundColor: TASK_TAG_COLORS[task.tag] + "20",
                      color: TASK_TAG_COLORS[task.tag],
                    }}
                  >
                    {TASK_TAG_LABELS[task.tag]}
                  </Badge>
                )}

                <span
                  className="size-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: TASK_PRIORITY_COLORS[task.priority],
                  }}
                  title={task.priority}
                />

                {task.due_date && (
                  <span
                    className={`flex items-center gap-1 text-[10px] ml-auto ${
                      isOverdue ? "text-red-400" : "text-muted-foreground"
                    }`}
                  >
                    <Calendar className="size-3" />
                    {new Date(task.due_date).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })}
                    {isOverdue && " !"}
                  </span>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </Draggable>
  );
}
