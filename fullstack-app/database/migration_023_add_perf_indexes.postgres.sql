-- Migration 023: performance indexes + quoted-table drift reconciliation (Postgres twin)
-- Reconcile earlier quoted migrations ("EmailOutbox","GradeAppeals") that diverged
-- from schema.postgres.sql unquoted (folded to lowercase). Copy any rows from
-- quoted tables into the canonical lower-case tables, then leave quoted tables
-- (do not drop automatically to avoid lock).

-- Note: earlier quoted migrations ("EmailOutbox","GradeAppeals") diverged from
-- schema.postgres.sql lower-case tables. Any rows in quoted tables should be
-- manually merged to the canonical lower-case tables. This migration only adds
-- indexes; data reconciliation is left manual to avoid DO-block split issues.

-- Hot-path indexes (idempotent)
CREATE INDEX IF NOT EXISTS IX_Assignments_due_date ON Assignments(due_date);
CREATE INDEX IF NOT EXISTS IX_Assignments_publish_date ON Assignments(publish_date);
CREATE INDEX IF NOT EXISTS IX_Assignments_lecturer_due ON Assignments(lecturer_id, due_date);
CREATE INDEX IF NOT EXISTS IX_Grades_released_at ON Grades(released_at);
CREATE INDEX IF NOT EXISTS IX_Notifications_user_created ON Notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS IX_AuditLog_entity ON AuditLog(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS IX_Announcements_target ON Announcements(target_role, target_department, target_level);
CREATE INDEX IF NOT EXISTS IX_Users_name_email ON Users(name, email);
CREATE INDEX IF NOT EXISTS IX_StorageBlobs_created_at ON "StorageBlobs"("created_at");
