-- ============================================
-- GTM Toolbox — Dashboard + Project + Integrations
-- ============================================

-- ============================================
-- 1. ENUMS
-- ============================================

CREATE TYPE workspace_status AS ENUM ('active', 'paused', 'completed');
CREATE TYPE workspace_priority AS ENUM ('urgent', 'normal', 'low');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'blocked', 'done');
CREATE TYPE task_priority AS ENUM ('urgent', 'normal', 'low');
CREATE TYPE task_tag AS ENUM ('outbound', 'inbound', 'strategy', 'admin');
CREATE TYPE integration_provider AS ENUM ('hubspot', 'pipedrive', 'attio', 'folk', 'notion', 'slack');
CREATE TYPE integration_status AS ENUM ('connected', 'disconnected', 'error', 'syncing');

-- ============================================
-- 2. ALTER workspaces
-- ============================================

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS status workspace_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS priority workspace_priority NOT NULL DEFAULT 'normal';

-- ============================================
-- 3. NEW TABLES
-- ============================================

CREATE TABLE workspace_metric_definitions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  metric_name   TEXT NOT NULL,
  label         TEXT NOT NULL,
  unit          TEXT DEFAULT '',
  position      INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, metric_name)
);

CREATE INDEX idx_ws_metric_defs_ws ON workspace_metric_definitions(workspace_id);

CREATE TABLE workspace_metrics (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  metric_name   TEXT NOT NULL,
  metric_value  NUMERIC NOT NULL DEFAULT 0,
  week_date     DATE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, metric_name, week_date)
);

CREATE INDEX idx_ws_metrics_ws ON workspace_metrics(workspace_id);
CREATE INDEX idx_ws_metrics_week ON workspace_metrics(workspace_id, week_date DESC);

CREATE TABLE tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT DEFAULT '',
  status        task_status NOT NULL DEFAULT 'todo',
  priority      task_priority NOT NULL DEFAULT 'normal',
  tag           task_tag,
  due_date      DATE,
  position      INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_ws ON tasks(workspace_id);
CREATE INDEX idx_tasks_status ON tasks(workspace_id, status);
CREATE INDEX idx_tasks_priority ON tasks(workspace_id, priority);

CREATE TABLE weekly_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  week_start    DATE NOT NULL,
  content       JSONB NOT NULL DEFAULT '{}',
  raw_markdown  TEXT DEFAULT '',
  share_token   UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_ws ON weekly_reports(workspace_id);
CREATE INDEX idx_reports_token ON weekly_reports(share_token);

CREATE TABLE integrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider        integration_provider NOT NULL,
  credentials     JSONB NOT NULL DEFAULT '{}',
  config          JSONB NOT NULL DEFAULT '{}',
  status          integration_status NOT NULL DEFAULT 'disconnected',
  last_sync_at    TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, provider)
);

CREATE INDEX idx_integrations_ws ON integrations(workspace_id);

CREATE TABLE integration_data (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider      integration_provider NOT NULL,
  data_type     TEXT NOT NULL,
  raw_data      JSONB NOT NULL DEFAULT '{}',
  synced_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_integration_data_ws ON integration_data(workspace_id, provider);
CREATE INDEX idx_integration_data_type ON integration_data(workspace_id, provider, data_type);

-- ============================================
-- 4. TRIGGERS
-- ============================================

CREATE TRIGGER set_updated_at BEFORE UPDATE ON workspace_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON weekly_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 5. RLS
-- ============================================

ALTER TABLE workspace_metric_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON workspace_metric_definitions
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_full_access" ON workspace_metrics
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_full_access" ON tasks
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_full_access" ON integrations
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_full_access" ON integration_data
  FOR ALL USING (auth.role() = 'authenticated');

-- Reports: full access for authenticated + public read for share links
CREATE POLICY "authenticated_full_access" ON weekly_reports
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "public_read_by_share_token" ON weekly_reports
  FOR SELECT USING (true);
