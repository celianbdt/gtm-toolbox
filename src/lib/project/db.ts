import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Task,
  TaskStatus,
  TaskTag,
  TaskPriority,
  WeeklyReport,
  MetricDefinition,
  WorkspaceMetric,
} from "@/lib/types/project";

// ── Tasks ──

export async function listTasks(
  workspaceId: string,
  filters?: { status?: TaskStatus[]; tag?: TaskTag; priority?: TaskPriority }
): Promise<Task[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("tasks")
    .select("*")
    .eq("workspace_id", workspaceId);

  if (filters?.status && filters.status.length > 0) {
    query = query.in("status", filters.status);
  }
  if (filters?.tag) {
    query = query.eq("tag", filters.tag);
  }
  if (filters?.priority) {
    query = query.eq("priority", filters.priority);
  }

  const { data, error } = await query
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Task[];
}

export async function createTask(payload: {
  workspace_id: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  tag?: TaskTag | null;
  due_date?: string | null;
  position?: number;
}): Promise<Task> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

export async function updateTask(
  taskId: string,
  updates: Partial<Task>
): Promise<Task> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", taskId)
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

export async function deleteTask(taskId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId);
  if (error) throw error;
}

export async function reorderTasks(
  tasks: { id: string; status: TaskStatus; position: number }[]
): Promise<void> {
  const supabase = createAdminClient();
  const promises = tasks.map((t) =>
    supabase
      .from("tasks")
      .update({ status: t.status, position: t.position })
      .eq("id", t.id)
  );
  const results = await Promise.all(promises);
  for (const result of results) {
    if (result.error) throw result.error;
  }
}

// ── Metrics ──

export async function getMetrics(
  workspaceId: string,
  weeks: number
): Promise<WorkspaceMetric[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("workspace_metrics")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("week_date", { ascending: false })
    .limit(weeks * 50); // generous limit to cover all metric names
  if (error) throw error;
  return (data ?? []) as WorkspaceMetric[];
}

export async function upsertMetrics(
  workspaceId: string,
  weekDate: string,
  metrics: { metric_name: string; metric_value: number }[]
): Promise<void> {
  const supabase = createAdminClient();
  const payload = metrics.map((m) => ({
    workspace_id: workspaceId,
    week_date: weekDate,
    metric_name: m.metric_name,
    metric_value: m.metric_value,
  }));
  const { error } = await supabase
    .from("workspace_metrics")
    .upsert(payload, { onConflict: "workspace_id,metric_name,week_date" });
  if (error) throw error;
}

export async function listMetricDefinitions(
  workspaceId: string
): Promise<MetricDefinition[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("workspace_metric_definitions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("position");
  if (error) throw error;
  return (data ?? []) as MetricDefinition[];
}

export async function createMetricDefinition(payload: {
  workspace_id: string;
  metric_name: string;
  label: string;
  unit?: string;
}): Promise<MetricDefinition> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("workspace_metric_definitions")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as MetricDefinition;
}

export async function deleteMetricDefinition(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("workspace_metric_definitions")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ── Reports ──

export async function listReports(
  workspaceId: string
): Promise<WeeklyReport[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("weekly_reports")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("week_start", { ascending: false });
  if (error) throw error;
  return (data ?? []) as WeeklyReport[];
}

export async function getReport(reportId: string): Promise<WeeklyReport> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("weekly_reports")
    .select("*")
    .eq("id", reportId)
    .single();
  if (error) throw error;
  return data as WeeklyReport;
}

export async function getReportByShareToken(
  shareToken: string
): Promise<WeeklyReport> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("weekly_reports")
    .select("*")
    .eq("share_token", shareToken)
    .single();
  if (error) throw error;
  return data as WeeklyReport;
}

export async function createReport(payload: {
  workspace_id: string;
  week_start: string;
  raw_markdown: string;
  content?: Record<string, unknown>;
}): Promise<WeeklyReport> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("weekly_reports")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as WeeklyReport;
}

export async function updateReport(
  reportId: string,
  updates: Partial<WeeklyReport>
): Promise<WeeklyReport> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("weekly_reports")
    .update(updates)
    .eq("id", reportId)
    .select()
    .single();
  if (error) throw error;
  return data as WeeklyReport;
}

export async function deleteReport(reportId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("weekly_reports")
    .delete()
    .eq("id", reportId);
  if (error) throw error;
}
