-- ============================================
-- GTM Toolbox — Ops Engine Schema
-- ============================================

-- ============================================
-- 1. ENUMS
-- ============================================

CREATE TYPE ops_column_type AS ENUM ('signal_input', 'enricher', 'ai_column', 'formula', 'static');
CREATE TYPE ops_row_status AS ENUM ('new', 'enriching', 'scored', 'actioned', 'archived');
CREATE TYPE ops_threshold_tier AS ENUM ('ignored', 'cold', 'warm', 'hot', 'priority');
CREATE TYPE ops_job_status AS ENUM ('pending', 'running', 'completed', 'failed');

CREATE TYPE enricher_provider AS ENUM (
  'apollo', 'icypeas', 'fullenrich', 'dropcontact', 'datagma',
  'hunter', 'clearbit', 'proxycurl', 'brandfetch', 'builtwith',
  'wappalyzer', 'firecrawl', 'serper'
);

CREATE TYPE signal_source AS ENUM (
  'crunchbase', 'proxycurl', 'linkedin_jobs', 'snitcher', 'newsapi',
  'csv_import', 'crm_import', 'manual', 'strat_bridge'
);

CREATE TYPE automation_type AS ENUM (
  'slack_webhook', 'email_digest', 'hubspot_push', 'lemlist_push',
  'instantly_push', 'smartlead_push', 'custom_webhook'
);

CREATE TYPE crm_provider AS ENUM ('hubspot', 'attio', 'pipedrive', 'folk');

-- ============================================
-- 2. TABLES
-- ============================================

-- Templates (must be created before ops_tables for FK reference)
CREATE TABLE ops_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  slug            TEXT NOT NULL UNIQUE,
  icon            TEXT DEFAULT 'Table',
  is_native       BOOLEAN NOT NULL DEFAULT false,
  columns_config  JSONB NOT NULL DEFAULT '[]',
  scoring_config  JSONB NOT NULL DEFAULT '{"rules":[],"thresholds":{"ignored":0,"cold":20,"warm":40,"hot":70,"priority":85}}',
  settings        JSONB NOT NULL DEFAULT '{}',
  automations_config JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ops Tables (the Clay-like tables)
CREATE TABLE ops_tables (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  template_id     UUID REFERENCES ops_templates(id) ON DELETE SET NULL,
  scoring_config  JSONB NOT NULL DEFAULT '{"rules":[],"thresholds":{"ignored":0,"cold":20,"warm":40,"hot":70,"priority":85}}',
  settings        JSONB NOT NULL DEFAULT '{"enrichment_threshold":40,"daily_signal_limit":100,"auto_enrich":true}',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ops_tables_workspace ON ops_tables(workspace_id);

-- Ops Columns (column definitions)
CREATE TABLE ops_columns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id        UUID NOT NULL REFERENCES ops_tables(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  key             TEXT NOT NULL,
  column_type     ops_column_type NOT NULL,
  position        INT NOT NULL DEFAULT 0,
  config          JSONB NOT NULL DEFAULT '{}',
  is_visible      BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(table_id, key)
);

CREATE INDEX idx_ops_columns_table ON ops_columns(table_id);

-- Ops Rows (the actual data rows)
CREATE TABLE ops_rows (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id          UUID NOT NULL REFERENCES ops_tables(id) ON DELETE CASCADE,
  status            ops_row_status NOT NULL DEFAULT 'new',
  domain            TEXT,
  data              JSONB NOT NULL DEFAULT '{}',
  score_total       INT NOT NULL DEFAULT 0,
  score_tier        ops_threshold_tier NOT NULL DEFAULT 'ignored',
  source            signal_source,
  source_meta       JSONB DEFAULT '{}',
  last_enriched_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ops_rows_table ON ops_rows(table_id);
CREATE INDEX idx_ops_rows_domain ON ops_rows(domain);
CREATE INDEX idx_ops_rows_score ON ops_rows(table_id, score_total DESC);
CREATE INDEX idx_ops_rows_tier ON ops_rows(table_id, score_tier);
CREATE INDEX idx_ops_rows_status ON ops_rows(table_id, status);

-- Ops Cell Values (per row+column)
CREATE TABLE ops_cell_values (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  row_id          UUID NOT NULL REFERENCES ops_rows(id) ON DELETE CASCADE,
  column_id       UUID NOT NULL REFERENCES ops_columns(id) ON DELETE CASCADE,
  value           TEXT,
  raw_value       JSONB,
  source          TEXT,
  confidence      FLOAT,
  cached_until    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(row_id, column_id)
);

CREATE INDEX idx_ops_cell_values_row ON ops_cell_values(row_id);

-- Enrichment Cache (domain-level, shared across tables)
CREATE TABLE ops_enrichment_cache (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  domain          TEXT NOT NULL,
  provider        enricher_provider NOT NULL,
  field_key       TEXT NOT NULL,
  value           TEXT,
  raw_response    JSONB,
  confidence      FLOAT,
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  UNIQUE(workspace_id, domain, provider, field_key)
);

CREATE INDEX idx_ops_cache_lookup ON ops_enrichment_cache(workspace_id, domain, provider);
CREATE INDEX idx_ops_cache_expiry ON ops_enrichment_cache(expires_at);

-- Score History (audit trail)
CREATE TABLE ops_score_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  row_id          UUID NOT NULL REFERENCES ops_rows(id) ON DELETE CASCADE,
  previous_score  INT NOT NULL,
  new_score       INT NOT NULL,
  previous_tier   ops_threshold_tier NOT NULL,
  new_tier        ops_threshold_tier NOT NULL,
  reason          TEXT NOT NULL,
  rule_snapshot   JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ops_score_history_row ON ops_score_history(row_id);

-- Automations (per table, per threshold)
CREATE TABLE ops_automations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id          UUID NOT NULL REFERENCES ops_tables(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  automation_type   automation_type NOT NULL,
  trigger_tier      ops_threshold_tier NOT NULL,
  config            JSONB NOT NULL DEFAULT '{}',
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ops_automations_table ON ops_automations(table_id);

-- Job Log (Inngest execution tracking)
CREATE TABLE ops_job_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  table_id        UUID REFERENCES ops_tables(id) ON DELETE SET NULL,
  job_type        TEXT NOT NULL,
  job_status      ops_job_status NOT NULL DEFAULT 'pending',
  input_data      JSONB DEFAULT '{}',
  output_data     JSONB DEFAULT '{}',
  error_message   TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ops_job_log_workspace ON ops_job_log(workspace_id);
CREATE INDEX idx_ops_job_log_table ON ops_job_log(table_id);

-- Cost Tracking (per workspace per month)
CREATE TABLE ops_cost_tracking (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  month           DATE NOT NULL,
  provider        enricher_provider NOT NULL,
  api_calls       INT NOT NULL DEFAULT 0,
  estimated_cost  DECIMAL(10,4) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, month, provider)
);

CREATE INDEX idx_ops_cost_tracking ON ops_cost_tracking(workspace_id, month);

-- ============================================
-- 3. UPDATED_AT TRIGGERS
-- ============================================

CREATE TRIGGER set_updated_at BEFORE UPDATE ON ops_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ops_tables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ops_columns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ops_rows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ops_cell_values
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ops_automations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 4. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE ops_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_cell_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_enrichment_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_job_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_cost_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON ops_templates
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_full_access" ON ops_tables
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_full_access" ON ops_columns
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_full_access" ON ops_rows
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_full_access" ON ops_cell_values
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_full_access" ON ops_enrichment_cache
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_full_access" ON ops_score_history
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_full_access" ON ops_automations
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_full_access" ON ops_job_log
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_full_access" ON ops_cost_tracking
  FOR ALL USING (auth.role() = 'authenticated');
