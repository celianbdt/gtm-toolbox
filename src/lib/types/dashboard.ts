export type WorkspaceStatus = "active" | "paused" | "completed";
export type WorkspacePriority = "urgent" | "normal" | "low";

export type WorkspaceWithMeta = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  logo_url: string | null;
  status: WorkspaceStatus;
  priority: WorkspacePriority;
  created_at: string;
  updated_at: string;
  metrics: { metric_name: string; label: string; value: number; unit: string }[];
  task_summary: { total: number; blocked: number; done_this_week: number };
  next_task: { title: string; due_date: string | null } | null;
};

export type DashboardFilters = {
  status: WorkspaceStatus | "all";
  priority: WorkspacePriority | "all";
};

export const STATUS_LABELS: Record<WorkspaceStatus, string> = {
  active: "Active",
  paused: "En pause",
  completed: "Terminé",
};

export const STATUS_COLORS: Record<WorkspaceStatus, string> = {
  active: "#10b981",
  paused: "#f59e0b",
  completed: "#6b7280",
};

export const PRIORITY_LABELS: Record<WorkspacePriority, string> = {
  urgent: "Urgent",
  normal: "Normal",
  low: "Low",
};

export const PRIORITY_COLORS: Record<WorkspacePriority, string> = {
  urgent: "#ef4444",
  normal: "#3b82f6",
  low: "#6b7280",
};
