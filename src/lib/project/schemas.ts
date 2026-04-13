import { z } from "zod";

// ── Task schemas ──

export const createTaskSchema = z.object({
  workspace_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(["todo", "in_progress", "blocked", "done"]).default("todo"),
  priority: z.enum(["urgent", "normal", "low"]).default("normal"),
  tag: z.enum(["outbound", "inbound", "strategy", "admin"]).nullable().optional(),
  due_date: z.string().nullable().optional(),
  position: z.number().int().min(0).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(["todo", "in_progress", "blocked", "done"]).optional(),
  priority: z.enum(["urgent", "normal", "low"]).optional(),
  tag: z.enum(["outbound", "inbound", "strategy", "admin"]).nullable().optional(),
  due_date: z.string().nullable().optional(),
  position: z.number().int().min(0).optional(),
});

export const reorderTasksSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string().uuid(),
      status: z.enum(["todo", "in_progress", "blocked", "done"]),
      position: z.number().int().min(0),
    })
  ).min(1),
});

// ── Metrics schemas ──

export const upsertMetricsSchema = z.object({
  workspace_id: z.string().uuid(),
  week_date: z.string(),
  metrics: z.array(
    z.object({
      metric_name: z.string().min(1),
      metric_value: z.number(),
    })
  ).min(1),
});

export const createMetricDefinitionSchema = z.object({
  workspace_id: z.string().uuid(),
  metric_name: z.string().min(1),
  label: z.string().min(1),
  unit: z.string().optional(),
});

// ── Report schemas ──

export const createReportSchema = z.object({
  workspace_id: z.string().uuid(),
  week_start: z.string(),
  raw_markdown: z.string(),
  content: z.record(z.string(), z.unknown()).optional(),
});

export const updateReportSchema = z.object({
  raw_markdown: z.string().optional(),
  content: z.record(z.string(), z.unknown()).optional(),
});
