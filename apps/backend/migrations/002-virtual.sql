CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
  path UNINDEXED,
  title,
  body,
  content='notes',
  content_rowid='rowid',
  tokenize='unicode61 remove_diacritics 2'
);

CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
  INSERT INTO notes_fts(rowid, path, title, body)
  VALUES (new.rowid, new.path, COALESCE(new.title, ''), new.body);
END;

CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, path, title, body)
  VALUES ('delete', old.rowid, old.path, COALESCE(old.title, ''), old.body);
END;

CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, path, title, body)
  VALUES ('delete', old.rowid, old.path, COALESCE(old.title, ''), old.body);
  INSERT INTO notes_fts(rowid, path, title, body)
  VALUES (new.rowid, new.path, COALESCE(new.title, ''), new.body);
END;

CREATE VIRTUAL TABLE IF NOT EXISTS chunks_vec USING vec0(
  embedding float[384]
);
