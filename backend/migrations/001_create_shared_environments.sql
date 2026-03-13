-- Migration: Create shared_environments table
-- Date: 2026-03-14
-- Feature: Cloud environment variable sync

CREATE TABLE IF NOT EXISTS shared_environments (
    id VARCHAR NOT NULL PRIMARY KEY,
    team_id VARCHAR NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    data TEXT NOT NULL DEFAULT '[]',
    updated_by VARCHAR NOT NULL REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by team_id
CREATE INDEX IF NOT EXISTS ix_shared_environments_team_id ON shared_environments(team_id);
