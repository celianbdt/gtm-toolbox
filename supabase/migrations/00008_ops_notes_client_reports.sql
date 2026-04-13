-- Ops Notes table
CREATE TABLE ops_notes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  content           TEXT NOT NULL DEFAULT '',
  source            TEXT NOT NULL DEFAULT 'manual',
  source_session_id UUID,
  tags              TEXT[] DEFAULT '{}',
  is_pinned         BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ops_notes_ws ON ops_notes(workspace_id);
CREATE INDEX idx_ops_notes_pinned ON ops_notes(workspace_id, is_pinned DESC);
CREATE INDEX idx_ops_notes_tags ON ops_notes USING gin(tags);

ALTER TABLE ops_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON ops_notes
  FOR ALL USING (auth.role() = 'authenticated');

CREATE TRIGGER set_updated_at_ops_notes BEFORE UPDATE ON ops_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Client Reports table (dashboard-level)
CREATE TABLE client_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  workspace_ids   UUID[] NOT NULL,
  vocal_notes     TEXT DEFAULT '',
  period          TEXT NOT NULL DEFAULT 'weekly',
  raw_markdown    TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_reports_user ON client_reports(user_id);

ALTER TABLE client_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON client_reports
  FOR ALL USING (auth.role() = 'authenticated');

CREATE TRIGGER set_updated_at_client_reports BEFORE UPDATE ON client_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
