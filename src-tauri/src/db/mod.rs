pub const MIGRATION_SQL: &str = r#"
-- Collections 表（資料夾 + 請求統一樹結構）
CREATE TABLE IF NOT EXISTS collection_nodes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    node_type TEXT NOT NULL CHECK(node_type IN ('collection', 'folder', 'request')),
    parent_id TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    request_data TEXT, -- JSON: SavedRequest（僅 node_type='request' 時有值）
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (parent_id) REFERENCES collection_nodes(id) ON DELETE CASCADE
);

-- 環境變數表
CREATE TABLE IF NOT EXISTS environments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 環境變數項目表
CREATE TABLE IF NOT EXISTS env_variables (
    id TEXT PRIMARY KEY,
    environment_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE
);

-- 全域變數表
CREATE TABLE IF NOT EXISTS global_variables (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL,
    value TEXT NOT NULL DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 1
);

-- 請求歷史紀錄表
CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY,
    method TEXT NOT NULL,
    url TEXT NOT NULL,
    status INTEGER NOT NULL,
    duration INTEGER NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    request_headers TEXT, -- JSON
    request_body TEXT,
    response_headers TEXT, -- JSON
    response_body TEXT,
    response_size INTEGER NOT NULL DEFAULT 0
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_collection_parent ON collection_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_collection_sort ON collection_nodes(parent_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_env_variables ON env_variables(environment_id);
CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history(timestamp DESC);
"#;

pub const MIGRATION_V2_SQL: &str = r#"
-- Workspace 工作區表
CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- collection_nodes 加入 workspace_id 欄位
ALTER TABLE collection_nodes ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL;

-- 建立預設工作區並將既有 collection 指派過去
INSERT INTO workspaces (id, name, is_active) VALUES ('default-workspace', 'My Workspace', 1);
UPDATE collection_nodes SET workspace_id = 'default-workspace' WHERE node_type = 'collection';

-- 索引
CREATE INDEX IF NOT EXISTS idx_collection_workspace ON collection_nodes(workspace_id);
"#;

pub const MIGRATION_V3_SQL: &str = r#"
-- workspaces 加入 team_id 欄位（關聯到後端 Team）
ALTER TABLE workspaces ADD COLUMN team_id TEXT;
"#;
