CREATE TABLE IF NOT EXISTS notes (
  rowid INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL UNIQUE,
  mtime_ms INTEGER NOT NULL,
  body TEXT NOT NULL,
  frontmatter_json TEXT,
  title TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  note_path TEXT NOT NULL REFERENCES notes(path) ON DELETE CASCADE ON UPDATE CASCADE,
  chunk_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  start_char INTEGER NOT NULL,
  end_char INTEGER NOT NULL,
  UNIQUE (note_path, chunk_index)
);

CREATE TABLE IF NOT EXISTS wikilinks (
  source_path TEXT NOT NULL,
  target_slug TEXT NOT NULL,
  occurrence_count INTEGER NOT NULL,
  PRIMARY KEY (source_path, target_slug)
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
