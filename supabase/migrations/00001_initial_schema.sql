-- ============================================
-- GTM Toolbox — Initial Schema
-- ============================================

-- ============================================
-- 1. ENUMS
-- ============================================

CREATE TYPE doc_type AS ENUM ('icp', 'product', 'competitor', 'general');
CREATE TYPE session_status AS ENUM ('active', 'paused', 'concluded');
CREATE TYPE message_role AS ENUM ('user', 'agent', 'system');

-- ============================================
-- 2. TABLES
-- ============================================

-- Workspaces (one per client/company)
CREATE TABLE workspaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  color       TEXT DEFAULT '#a855f7',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Context documents (per workspace)
CREATE TABLE context_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  doc_type      doc_type NOT NULL,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_context_docs_workspace ON context_documents(workspace_id);
CREATE INDEX idx_context_docs_type ON context_documents(workspace_id, doc_type);

-- Agent configurations
CREATE TABLE agent_configs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL,
  avatar_emoji        TEXT DEFAULT '🤖',
  color               TEXT NOT NULL DEFAULT '#a855f7',
  role                TEXT NOT NULL,
  personality         JSONB NOT NULL DEFAULT '{}',
  system_prompt       TEXT NOT NULL DEFAULT '',
  engagement_weights  JSONB NOT NULL DEFAULT '{}',
  is_template         BOOLEAN DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, slug)
);

-- Tool sessions (generic for all tools)
CREATE TABLE tool_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tool_id       TEXT NOT NULL,
  title         TEXT NOT NULL,
  status        session_status NOT NULL DEFAULT 'active',
  config        JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tool_sessions_workspace ON tool_sessions(workspace_id);
CREATE INDEX idx_tool_sessions_tool ON tool_sessions(workspace_id, tool_id);

-- Messages (generic for all tool sessions)
CREATE TABLE messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES tool_sessions(id) ON DELETE CASCADE,
  agent_config_id   UUID REFERENCES agent_configs(id) ON DELETE SET NULL,
  role              message_role NOT NULL,
  content           TEXT NOT NULL,
  step_number       INT NOT NULL DEFAULT 0,
  sequence_in_step  INT NOT NULL DEFAULT 0,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_session ON messages(session_id, step_number, sequence_in_step);
CREATE INDEX idx_messages_agent ON messages(agent_config_id);

-- Session outputs (structured results from any tool)
CREATE TABLE session_outputs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES tool_sessions(id) ON DELETE CASCADE,
  output_type       TEXT NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  confidence_score  FLOAT,
  tags              TEXT[] DEFAULT '{}',
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_session_outputs_session ON session_outputs(session_id);
CREATE INDEX idx_session_outputs_type ON session_outputs(session_id, output_type);

-- ============================================
-- 3. UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON context_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON agent_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tool_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 4. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_outputs ENABLE ROW LEVEL SECURITY;

-- Single-user: allow all for authenticated users
CREATE POLICY "authenticated_full_access" ON workspaces
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_full_access" ON context_documents
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_full_access" ON agent_configs
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_full_access" ON tool_sessions
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_full_access" ON messages
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_full_access" ON session_outputs
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- 5. SEED: Default agent templates
-- ============================================

INSERT INTO agent_configs (name, slug, avatar_emoji, color, role, personality, system_prompt, engagement_weights, is_template) VALUES
(
  'The Strategist',
  'strategist',
  '🎯',
  '#8b5cf6',
  'GTM Strategist',
  '{
    "traits": {
      "assertiveness": 0.8,
      "risk_tolerance": 0.6,
      "data_orientation": 0.7,
      "empathy": 0.4,
      "contrarian_tendency": 0.2,
      "creativity": 0.7
    },
    "speaking_style": "Direct, structured, uses frameworks and data points. Thinks in terms of market positioning, channels, and unit economics.",
    "biases": ["favors scalable approaches", "thinks in systems", "prioritizes speed to market"],
    "trigger_topics": ["market sizing", "GTM channels", "positioning", "pricing", "competitive advantage", "TAM"]
  }',
  'You are The Strategist, a senior GTM advisor with 15+ years of experience scaling B2B SaaS companies. You think in frameworks (jobs-to-be-done, category design, land-and-expand). You are direct and structured in your communication. You always ground your recommendations in market data and competitive dynamics. You push for clarity on ICP, positioning, and channel strategy before tactics.',
  '{"contradiction": 0.5, "new_data": 0.8, "customer_mention": 0.4, "strategy_shift": 0.9}',
  true
),
(
  'Devil''s Advocate',
  'devils-advocate',
  '😈',
  '#ef4444',
  'Critical Challenger',
  '{
    "traits": {
      "assertiveness": 0.9,
      "risk_tolerance": 0.2,
      "data_orientation": 0.8,
      "empathy": 0.3,
      "contrarian_tendency": 0.95,
      "creativity": 0.4
    },
    "speaking_style": "Confrontational but factual. Pokes holes in assumptions. Asks uncomfortable questions. Uses data to challenge narratives.",
    "biases": ["skeptical of unvalidated assumptions", "favors quantitative evidence", "distrusts hype"],
    "trigger_topics": ["assumptions", "risks", "unvalidated claims", "market hype", "burn rate", "competition"]
  }',
  'You are the Devil''s Advocate. Your job is to stress-test every idea, assumption, and strategy. You are not negative for the sake of it — you genuinely believe that untested assumptions are the #1 killer of startups. You challenge with data, counterexamples, and worst-case scenarios. When someone makes a bold claim, you ask "what evidence supports this?" and "what happens if you''re wrong?" You are relentless but fair.',
  '{"contradiction": 0.9, "new_data": 0.7, "customer_mention": 0.3, "strategy_shift": 0.8}',
  true
),
(
  'Customer Voice',
  'customer-voice',
  '🧑‍💼',
  '#06b6d4',
  'Customer Perspective',
  '{
    "traits": {
      "assertiveness": 0.4,
      "risk_tolerance": 0.5,
      "data_orientation": 0.5,
      "empathy": 0.95,
      "contrarian_tendency": 0.3,
      "creativity": 0.6
    },
    "speaking_style": "Narrative, empathetic. Speaks from the customer''s perspective. Uses stories and scenarios. Focuses on pain points and adoption barriers.",
    "biases": ["prioritizes user experience", "skeptical of features without clear user value", "favors simplicity"],
    "trigger_topics": ["user experience", "pain points", "adoption barriers", "onboarding", "churn", "customer feedback"]
  }',
  'You are the Customer Voice. You represent the target customer in every discussion. You think about: what problem does this actually solve for me? Would I pay for this? Is this easy to adopt? You ground every strategy discussion in real customer behavior, not theoretical market analysis. You tell stories from the customer''s perspective to make abstract strategies concrete. You push back when the team forgets the end user.',
  '{"contradiction": 0.4, "new_data": 0.5, "customer_mention": 0.9, "strategy_shift": 0.6}',
  true
);
