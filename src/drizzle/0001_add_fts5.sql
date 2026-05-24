CREATE VIRTUAL TABLE tasks_fts USING fts5(
  id UNINDEXED,
  title,
  keywords,
  archive_notes
);
--> statement-breakpoint
INSERT INTO tasks_fts(id, title, keywords, archive_notes)
SELECT id, title, COALESCE(keywords, ''), COALESCE(archive_notes, '')
FROM tasks WHERE retained = 1;
--> statement-breakpoint
CREATE TRIGGER tasks_fts_ai AFTER UPDATE ON tasks
WHEN NEW.retained = 1 AND OLD.retained = 0
BEGIN
  INSERT INTO tasks_fts(id, title, keywords, archive_notes)
  VALUES (NEW.id, NEW.title, COALESCE(NEW.keywords, ''), COALESCE(NEW.archive_notes, ''));
END;
--> statement-breakpoint
CREATE TRIGGER tasks_fts_au AFTER UPDATE ON tasks
WHEN NEW.retained = 1 AND OLD.retained = 1
BEGIN
  DELETE FROM tasks_fts WHERE id = OLD.id;
  INSERT INTO tasks_fts(id, title, keywords, archive_notes)
  VALUES (NEW.id, NEW.title, COALESCE(NEW.keywords, ''), COALESCE(NEW.archive_notes, ''));
END;
--> statement-breakpoint
CREATE TRIGGER tasks_fts_ad AFTER DELETE ON tasks
WHEN OLD.retained = 1
BEGIN
  DELETE FROM tasks_fts WHERE id = OLD.id;
END;
