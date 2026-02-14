CREATE TABLE IF NOT EXISTS bulk_jobs (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  shop_domain TEXT NOT NULL,
  access_token TEXT NOT NULL,
  status TEXT NOT NULL,
  selection_json TEXT NOT NULL,
  structure_json TEXT NOT NULL,
  custom_prompt TEXT,
  cursor TEXT,
  offset INTEGER,
  processed_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
