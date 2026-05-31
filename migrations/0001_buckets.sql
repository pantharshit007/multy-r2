CREATE TABLE IF NOT EXISTS buckets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  binding_name TEXT,
  endpoint TEXT,
  custom_domain TEXT,
  access_mode TEXT NOT NULL DEFAULT 'public' CHECK (access_mode IN ('public', 'private', 'signed-link')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_buckets_sort_order ON buckets(sort_order, name);
