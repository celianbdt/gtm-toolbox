import { z } from "zod";

// ── Column config schemas ──

export const signalInputConfigSchema = z.object({
  source: z.enum([
    "crunchbase", "proxycurl", "linkedin_jobs", "snitcher", "newsapi",
    "csv_import", "crm_import", "manual", "strat_bridge",
  ]),
  filters: z.record(z.string(), z.unknown()).default({}),
  schedule: z.string().optional(),
});

export const waterfallStepSchema = z.object({
  provider: z.enum([
    "apollo", "icypeas", "fullenrich", "dropcontact", "datagma",
    "hunter", "clearbit", "proxycurl", "brandfetch", "builtwith",
    "wappalyzer", "firecrawl", "serper",
  ]),
  fields: z.array(z.string()),
  timeout_ms: z.number().optional(),
});

export const enricherColumnConfigSchema = z.object({
  waterfall: z.array(waterfallStepSchema).min(1),
  cache_ttl_days: z.number().default(30),
  min_score_threshold: z.number().optional(),
});

export const aiColumnConfigSchema = z.object({
  prompt: z.string().min(1),
  model: z.string().default("claude-haiku-4-5"),
  output_type: z.enum(["text", "number", "boolean", "json"]),
  max_tokens: z.number().optional(),
});

export const formulaColumnConfigSchema = z.object({
  expression: z.string().min(1),
  output_type: z.enum(["number", "text", "boolean"]),
});

// ── Scoring schemas ──

export const scoringRuleSchema = z.object({
  id: z.string(),
  label: z.string(),
  column_key: z.string(),
  operator: z.enum([
    "equals", "not_equals", "contains", "not_contains",
    "greater_than", "less_than", "within_days",
    "matches_list", "is_empty", "is_not_empty", "ai_evaluation",
  ]),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
  score_impact: z.number(),
  ai_prompt: z.string().optional(),
});

export const thresholdConfigSchema = z.object({
  ignored: z.number().default(0),
  cold: z.number().default(20),
  warm: z.number().default(40),
  hot: z.number().default(70),
  priority: z.number().default(85),
});

export const scoringConfigSchema = z.object({
  rules: z.array(scoringRuleSchema).default([]),
  thresholds: thresholdConfigSchema.default({ ignored: 0, cold: 20, warm: 40, hot: 70, priority: 85 }),
});

// ── Table schemas ──

export const tableSettingsSchema = z.object({
  enrichment_threshold: z.number().default(40),
  daily_signal_limit: z.number().default(100),
  auto_enrich: z.boolean().default(true),
});

export const createTableSchema = z.object({
  workspace_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  template_id: z.string().uuid().nullable().optional(),
  scoring_config: scoringConfigSchema.optional(),
  settings: tableSettingsSchema.optional(),
});

export const updateTableSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  scoring_config: scoringConfigSchema.optional(),
  settings: tableSettingsSchema.optional(),
  is_active: z.boolean().optional(),
});

// ── Column schemas ──

export const createColumnSchema = z.object({
  name: z.string().min(1).max(200),
  key: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/, "Key must be lowercase alphanumeric with underscores"),
  column_type: z.enum(["signal_input", "enricher", "ai_column", "formula", "static"]),
  position: z.number().int().min(0).optional(),
  config: z.record(z.string(), z.unknown()).default({}),
  is_visible: z.boolean().default(true),
});

export const updateColumnSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  column_type: z.enum(["signal_input", "enricher", "ai_column", "formula", "static"]).optional(),
  position: z.number().int().min(0).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  is_visible: z.boolean().optional(),
});

// ── Row schemas ──

export const createRowSchema = z.object({
  domain: z.string().nullable().optional(),
  data: z.record(z.string(), z.unknown()).default({}),
  source: z.enum([
    "crunchbase", "proxycurl", "linkedin_jobs", "snitcher", "newsapi",
    "csv_import", "crm_import", "manual", "strat_bridge",
  ]).optional(),
  source_meta: z.record(z.string(), z.unknown()).default({}),
});

export const updateRowSchema = z.object({
  data: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(["new", "enriching", "scored", "actioned", "archived"]).optional(),
  domain: z.string().nullable().optional(),
});

export const bulkImportSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).min(1).max(10000),
  source: z.enum([
    "crunchbase", "proxycurl", "linkedin_jobs", "snitcher", "newsapi",
    "csv_import", "crm_import", "manual", "strat_bridge",
  ]).default("csv_import"),
  domain_column: z.string().optional(),
});

// ── Automation schemas ──

export const createAutomationSchema = z.object({
  name: z.string().min(1).max(200),
  automation_type: z.enum([
    "slack_webhook", "email_digest", "hubspot_push", "lemlist_push",
    "instantly_push", "smartlead_push", "custom_webhook",
  ]),
  trigger_tier: z.enum(["ignored", "cold", "warm", "hot", "priority"]),
  config: z.record(z.string(), z.unknown()).default({}),
  is_active: z.boolean().default(true),
});

export const updateAutomationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  trigger_tier: z.enum(["ignored", "cold", "warm", "hot", "priority"]).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  is_active: z.boolean().optional(),
});

// ── Enrichment trigger schema ──

export const triggerEnrichmentSchema = z.object({
  row_ids: z.array(z.string().uuid()).optional(),
  all: z.boolean().optional(),
  tier_filter: z.enum(["ignored", "cold", "warm", "hot", "priority"]).optional(),
});

// ── Rows query params ──

export const rowsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  sort: z.string().default("score_total"),
  order: z.enum(["asc", "desc"]).default("desc"),
  tier: z.enum(["ignored", "cold", "warm", "hot", "priority"]).optional(),
  search: z.string().optional(),
  status: z.enum(["new", "enriching", "scored", "actioned", "archived"]).optional(),
});
