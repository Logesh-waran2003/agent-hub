# Database Schema

## Engine

- **SQLite** via `better-sqlite3` (synchronous API, fastest Node.js SQLite binding)
- **sqlite-vec** extension for vector similarity search
- **WAL mode** enabled for concurrent reads during writes
- Single file: `data/hub.db`

## Initialization

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
```

## Tables

### sessions

Persists terminal session configuration. PTY processes are ephemeral (recreated on server start), but their config survives restarts.

```sql
CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,              -- UUID v4
  name        TEXT NOT NULL UNIQUE,          -- @mention handle, e.g. "kiro-main"
  command     TEXT NOT NULL,                 -- e.g. "kiro-cli chat --resume"
  cwd         TEXT NOT NULL,                 -- working directory
  type        TEXT NOT NULL DEFAULT 'shell', -- "kiro" | "shell"
  tab_id      TEXT NOT NULL,                 -- references tabs.id
  layout      TEXT,                          -- JSON: panel position within tab
  env         TEXT,                          -- JSON: extra env vars
  auto_restart INTEGER NOT NULL DEFAULT 0,   -- 1 = restart on crash
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX idx_sessions_name ON sessions(name);
CREATE INDEX idx_sessions_tab ON sessions(tab_id);
```

### tabs

Tab groups that contain sessions.

```sql
CREATE TABLE tabs (
  id          TEXT PRIMARY KEY,              -- UUID v4
  name        TEXT NOT NULL,                 -- display name, e.g. "Project Alpha"
  position    INTEGER NOT NULL DEFAULT 0,    -- tab order (0-based)
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_tabs_position ON tabs(position);
```

### tasks

Task manager entries.

```sql
CREATE TABLE tasks (
  id              TEXT PRIMARY KEY,          -- UUID v4
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'pending', -- "pending" | "active" | "done" | "cancelled"
  priority        INTEGER NOT NULL DEFAULT 0,      -- 0=normal, 1=high, 2=urgent
  assigned_session TEXT,                     -- session name (not id, for readability)
  depends_on      TEXT,                      -- JSON array of task IDs
  created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
  started_at      INTEGER,
  completed_at    INTEGER
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_session ON tasks(assigned_session);
```

### memory

Shared memory entries with metadata. Content stored here, vectors in vec_memory.

```sql
CREATE TABLE memory (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_name TEXT,                         -- source session, nullable for manual entries
  content     TEXT NOT NULL,                 -- the actual text content
  summary     TEXT,                          -- optional short summary
  tags        TEXT,                          -- JSON array of tags
  source      TEXT NOT NULL DEFAULT 'auto',  -- "auto" | "manual" | "task"
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_memory_session ON memory(session_name);
CREATE INDEX idx_memory_created ON memory(created_at DESC);
```

### vec_memory (sqlite-vec virtual table)

Vector embeddings for semantic search over memory entries.

```sql
CREATE VIRTUAL TABLE vec_memory USING vec0(
  embedding float[768]                       -- dimension depends on embedding model
);
```

**Relationship**: `vec_memory.rowid` corresponds to `memory.id`. Insert into both tables in a transaction.

### settings

Key-value store for app configuration.

```sql
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Default settings
INSERT INTO settings (key, value) VALUES
  ('context_lines', '50'),           -- lines captured for @mention
  ('auto_capture_interval', '300'),  -- seconds between auto memory captures
  ('embedding_model', 'nomic-embed-text'),
  ('embedding_provider', 'groq'),
  ('theme', 'dark');
```

## Queries

### @Mention Context Capture

```sql
-- Not a DB query; reads from in-memory ring buffer
-- But session lookup is:
SELECT id, name, command, type FROM sessions WHERE name = ?;
```

### Semantic Memory Search

```sql
SELECT
  m.id, m.content, m.summary, m.session_name, m.tags, m.created_at,
  v.distance
FROM vec_memory v
INNER JOIN memory m ON m.id = v.rowid
WHERE v.embedding MATCH ?
ORDER BY v.distance
LIMIT ?;
```

### Task Queries

```sql
-- Active tasks for a session
SELECT * FROM tasks
WHERE assigned_session = ? AND status IN ('pending', 'active')
ORDER BY priority DESC, created_at ASC;

-- Tasks with unmet dependencies
SELECT t.* FROM tasks t
WHERE t.status = 'pending'
  AND t.depends_on IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM tasks dep
    WHERE dep.id IN (SELECT value FROM json_each(t.depends_on))
      AND dep.status != 'done'
  );
```

### Workspace Restore (on server start)

```sql
-- Load all tabs ordered by position
SELECT * FROM tabs ORDER BY position;

-- Load all sessions grouped by tab
SELECT * FROM sessions ORDER BY tab_id, created_at;
```

## Migrations

Version tracked in settings table:

```sql
INSERT OR IGNORE INTO settings (key, value) VALUES ('schema_version', '1');
```

Migration runner checks `schema_version` and applies incremental SQL scripts.

## Embedding Pipeline

```
Content text
    │
    ▼
Groq API: POST /v1/embeddings
  model: "nomic-embed-text"
  input: [content]
    │
    ▼
float32[768] vector
    │
    ▼
INSERT INTO memory (content, ...) → get lastInsertRowid
INSERT INTO vec_memory (rowid, embedding) VALUES (rowid, vector_blob)
```

Vector is stored as raw Float32Array buffer (768 × 4 = 3072 bytes per entry).
