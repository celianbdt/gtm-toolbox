"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  type Task,
  TASK_STATUS_LABELS,
  TASK_TAG_LABELS,
  TASK_TAG_COLORS,
  TASK_PRIORITY_COLORS,
} from "@/lib/types/project";
import { ArrowUpDown, Calendar } from "lucide-react";

type SortKey = "title" | "status" | "priority" | "tag" | "due_date";
type SortDir = "asc" | "desc";

type TaskListViewProps = {
  tasks: Task[];
  onCardClick: (task: Task) => void;
};

const PRIORITY_ORDER = { urgent: 0, normal: 1, low: 2 } as const;
const STATUS_ORDER = { todo: 0, in_progress: 1, blocked: 2, done: 3 } as const;

function SortHeader({
  label,
  field,
  activeSortKey,
  onToggle,
  className,
}: {
  label: string;
  field: SortKey;
  activeSortKey: SortKey;
  onToggle: (key: SortKey) => void;
  className?: string;
}) {
  return (
    <button
      className={`flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors ${className ?? ""}`}
      onClick={() => onToggle(field)}
    >
      {label}
      <ArrowUpDown
        className={`size-3 ${activeSortKey === field ? "text-foreground" : "opacity-30"}`}
      />
    </button>
  );
}

function isOverdue(t: Task) {
  return t.due_date && new Date(t.due_date) < new Date() && t.status !== "done";
}

export function TaskListView({ tasks, onCardClick }: TaskListViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = [...tasks].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortKey) {
      case "title":
        return dir * a.title.localeCompare(b.title);
      case "status":
        return dir * (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
      case "priority":
        return dir * (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
      case "tag":
        return dir * ((a.tag ?? "zzz").localeCompare(b.tag ?? "zzz"));
      case "due_date":
        return (
          dir *
          ((a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))
        );
      default:
        return 0;
    }
  });

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-auto">
      {/* Header row */}
      <div className="grid grid-cols-[1fr_100px_90px_90px_100px] gap-2 px-3 py-2 border-b border-border/50 sticky top-0 bg-background z-10">
        <SortHeader label="Titre" field="title" activeSortKey={sortKey} onToggle={toggleSort} />
        <SortHeader label="Statut" field="status" activeSortKey={sortKey} onToggle={toggleSort} />
        <SortHeader label="Priorite" field="priority" activeSortKey={sortKey} onToggle={toggleSort} />
        <SortHeader label="Tag" field="tag" activeSortKey={sortKey} onToggle={toggleSort} />
        <SortHeader label="Echeance" field="due_date" activeSortKey={sortKey} onToggle={toggleSort} />
      </div>

      {/* Rows */}
      {sorted.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Aucune tache</p>
        </div>
      )}
      {sorted.map((task) => (
        <button
          key={task.id}
          className="grid grid-cols-[1fr_100px_90px_90px_100px] gap-2 px-3 py-2.5 border-b border-border/20 hover:bg-muted/30 transition-colors text-left w-full"
          onClick={() => onCardClick(task)}
        >
          <span className="text-sm font-medium truncate">{task.title}</span>

          <Badge variant="outline" className="text-[10px] h-5 w-fit">
            {TASK_STATUS_LABELS[task.status]}
          </Badge>

          <span className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: TASK_PRIORITY_COLORS[task.priority] }}
            />
            <span className="text-xs text-muted-foreground capitalize">
              {task.priority}
            </span>
          </span>

          <span>
            {task.tag ? (
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
            ) : (
              <span className="text-xs text-muted-foreground/40">-</span>
            )}
          </span>

          <span
            className={`flex items-center gap-1 text-xs ${
              isOverdue(task) ? "text-red-400" : "text-muted-foreground"
            }`}
          >
            {task.due_date ? (
              <>
                <Calendar className="size-3" />
                {new Date(task.due_date).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                })}
                {isOverdue(task) && " !"}
              </>
            ) : (
              <span className="text-muted-foreground/40">-</span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
