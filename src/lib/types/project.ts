export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";
export type TaskPriority = "urgent" | "normal" | "low";
export type TaskTag = "outbound" | "inbound" | "strategy" | "admin";

export type Task = {
  id: string;
  workspace_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  tag: TaskTag | null;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type WeeklyReport = {
  id: string;
  workspace_id: string;
  week_start: string;
  content: Record<string, unknown>;
  raw_markdown: string;
  share_token: string;
  created_at: string;
  updated_at: string;
};

export type MetricDefinition = {
  id: string;
  workspace_id: string;
  metric_name: string;
  label: string;
  unit: string;
  position: number;
  created_at: string;
};

export type WorkspaceMetric = {
  id: string;
  workspace_id: string;
  metric_name: string;
  metric_value: number;
  week_date: string;
  created_at: string;
  updated_at: string;
};

// Kanban column labels
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "À faire",
  in_progress: "En cours",
  blocked: "Bloqué",
  done: "Fait",
};

export const TASK_STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "blocked", "done"];

export const TASK_TAG_LABELS: Record<TaskTag, string> = {
  outbound: "Outbound",
  inbound: "Inbound",
  strategy: "Strategy",
  admin: "Admin",
};

export const TASK_TAG_COLORS: Record<TaskTag, string> = {
  outbound: "#10b981",
  inbound: "#3b82f6",
  strategy: "#8b5cf6",
  admin: "#f59e0b",
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  urgent: "#ef4444",
  normal: "#3b82f6",
  low: "#6b7280",
};
