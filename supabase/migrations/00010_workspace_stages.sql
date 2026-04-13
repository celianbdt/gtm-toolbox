CREATE TYPE mission_stage AS ENUM ('discovery', 'foundation', 'optimization', 'scaling');
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS mission_stage mission_stage NOT NULL DEFAULT 'discovery';
