// ── Column Types ──

export type OpsColumnType =
  | "signal_input"
  | "enricher"
  | "ai_column"
  | "formula"
  | "static";

export type SignalSource =
  | "crunchbase"
  | "proxycurl"
  | "linkedin_jobs"
  | "snitcher"
  | "newsapi"
  | "csv_import"
  | "crm_import"
  | "manual"
  | "strat_bridge";

export type EnricherProvider =
  | "apollo"
  | "icypeas"
  | "fullenrich"
  | "dropcontact"
  | "datagma"
  | "hunter"
  | "clearbit"
  | "proxycurl"
  | "brandfetch"
  | "builtwith"
  | "wappalyzer"
  | "firecrawl"
  | "serper";

export type AutomationType =
  | "slack_webhook"
  | "email_digest"
  | "hubspot_push"
  | "lemlist_push"
  | "instantly_push"
  | "smartlead_push"
  | "custom_webhook";

export type CrmProvider = "hubspot" | "attio" | "pipedrive" | "folk";

export type RowStatus = "new" | "enriching" | "scored" | "actioned" | "archived";
export type ThresholdTier = "ignored" | "cold" | "warm" | "hot" | "priority";
export type JobStatus = "pending" | "running" | "completed" | "failed";

// ── Scoring ──

export type ScoringOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "greater_than"
  | "less_than"
  | "within_days"
  | "matches_list"
  | "is_empty"
  | "is_not_empty"
  | "ai_evaluation";

export type ScoringRule = {
  id: string;
  label: string;
  column_key: string;
  operator: ScoringOperator;
  value: string | number | string[];
  score_impact: number;
  ai_prompt?: string;
};

export type ThresholdConfig = {
  ignored: number;
  cold: number;
  warm: number;
  hot: number;
  priority: number;
};

export type ScoringConfig = {
  rules: ScoringRule[];
  thresholds: ThresholdConfig;
};

// ── Column Configs (JSONB shapes) ──

export type SignalInputConfig = {
  source: SignalSource;
  filters: Record<string, unknown>;
  schedule?: string;
};

export type WaterfallStep = {
  provider: EnricherProvider;
  fields: string[];
  timeout_ms?: number;
};

export type EnricherColumnConfig = {
  waterfall: WaterfallStep[];
  cache_ttl_days: number;
  min_score_threshold?: number;
};

export type AIColumnConfig = {
  prompt: string;
  model: string;
  output_type: "text" | "number" | "boolean" | "json";
  max_tokens?: number;
};

export type FormulaColumnConfig = {
  expression: string;
  output_type: "number" | "text" | "boolean";
};

export type ColumnConfig =
  | SignalInputConfig
  | EnricherColumnConfig
  | AIColumnConfig
  | FormulaColumnConfig
  | Record<string, unknown>;

// ── Core Entities ──

export type OpsTableSettings = {
  enrichment_threshold: number;
  daily_signal_limit: number;
  auto_enrich: boolean;
};

export type OpsTable = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  template_id: string | null;
  scoring_config: ScoringConfig;
  settings: OpsTableSettings;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type OpsColumn = {
  id: string;
  table_id: string;
  name: string;
  key: string;
  column_type: OpsColumnType;
  position: number;
  config: ColumnConfig;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
};

export type OpsRow = {
  id: string;
  table_id: string;
  status: RowStatus;
  domain: string | null;
  data: Record<string, unknown>;
  score_total: number;
  score_tier: ThresholdTier;
  source: SignalSource | null;
  source_meta: Record<string, unknown>;
  last_enriched_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OpsCellValue = {
  id: string;
  row_id: string;
  column_id: string;
  value: string | null;
  raw_value: Record<string, unknown> | null;
  source: string | null;
  confidence: number | null;
  cached_until: string | null;
  created_at: string;
  updated_at: string;
};

export type OpsTemplate = {
  id: string;
  workspace_id: string | null;
  name: string;
  description: string | null;
  slug: string;
  icon: string;
  is_native: boolean;
  columns_config: TemplateColumn[];
  scoring_config: ScoringConfig;
  settings: OpsTableSettings;
  automations_config: TemplateAutomation[];
  created_at: string;
  updated_at: string;
};

export type TemplateColumn = {
  name: string;
  key: string;
  column_type: OpsColumnType;
  position: number;
  config: ColumnConfig;
  is_visible: boolean;
};

export type TemplateAutomation = {
  name: string;
  automation_type: AutomationType;
  trigger_tier: ThresholdTier;
  config: Record<string, unknown>;
  is_active: boolean;
};

export type OpsAutomation = {
  id: string;
  table_id: string;
  name: string;
  automation_type: AutomationType;
  trigger_tier: ThresholdTier;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type OpsScoreHistoryEntry = {
  id: string;
  row_id: string;
  previous_score: number;
  new_score: number;
  previous_tier: ThresholdTier;
  new_tier: ThresholdTier;
  reason: string;
  rule_snapshot: Record<string, unknown> | null;
  created_at: string;
};

export type OpsJobLog = {
  id: string;
  workspace_id: string;
  table_id: string | null;
  job_type: string;
  job_status: JobStatus;
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown>;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type OpsCostEntry = {
  id: string;
  workspace_id: string;
  month: string;
  provider: EnricherProvider;
  api_calls: number;
  estimated_cost: number;
  created_at: string;
};

// ── Enrichment Cache ──

export type OpsEnrichmentCacheEntry = {
  id: string;
  workspace_id: string;
  domain: string;
  provider: EnricherProvider;
  field_key: string;
  value: string | null;
  raw_response: Record<string, unknown> | null;
  confidence: number | null;
  fetched_at: string;
  expires_at: string;
};

// ── SSE Events ──

export type OpsSSEEvent =
  | { type: "agent_thinking"; message: string }
  | { type: "agent_delta"; delta: string }
  | { type: "table_created"; tableId: string; tableName: string }
  | { type: "columns_configured"; columns: { name: string; type: OpsColumnType }[] }
  | { type: "rows_importing"; count: number; source: string }
  | { type: "enrichment_started"; rowCount: number }
  | { type: "enrichment_progress"; completed: number; total: number }
  | { type: "scoring_complete"; tierCounts: Record<ThresholdTier, number> }
  | { type: "operation_complete"; tableId: string; summary: string }
  | { type: "error"; message: string };

// ── Bridge Types ──

export type BridgeProposal = {
  source_session_id: string;
  source_tool_id: string;
  proposed_table_name: string;
  proposed_columns: TemplateColumn[];
  proposed_scoring: ScoringConfig;
  proposed_settings: OpsTableSettings;
  rationale: string;
};

// ── Provider metadata ──

export const ENRICHER_LABELS: Record<EnricherProvider, string> = {
  apollo: "Apollo",
  icypeas: "Icypeas",
  fullenrich: "FullEnrich",
  dropcontact: "Dropcontact",
  datagma: "Datagma",
  hunter: "Hunter.io",
  clearbit: "Clearbit",
  proxycurl: "Proxycurl",
  brandfetch: "Brandfetch",
  builtwith: "BuiltWith",
  wappalyzer: "Wappalyzer",
  firecrawl: "Firecrawl",
  serper: "Serper",
};

export const SIGNAL_LABELS: Record<SignalSource, string> = {
  crunchbase: "Crunchbase",
  proxycurl: "Proxycurl",
  linkedin_jobs: "LinkedIn Jobs",
  snitcher: "Snitcher",
  newsapi: "NewsAPI",
  csv_import: "CSV Import",
  crm_import: "CRM Import",
  manual: "Manual",
  strat_bridge: "Strategy Bridge",
};

export const TIER_COLORS: Record<ThresholdTier, string> = {
  ignored: "#6b7280",
  cold: "#3b82f6",
  warm: "#f59e0b",
  hot: "#ef4444",
  priority: "#7c3aed",
};

export const TIER_LABELS: Record<ThresholdTier, string> = {
  ignored: "Ignored",
  cold: "Cold",
  warm: "Warm",
  hot: "Hot",
  priority: "Priority",
};
