-- GradeAppeals: single-round, post-release grade appeal loop (Postgres twin).
-- One row per appealed submission (UNIQUE submission_id). Status: open|accepted|rejected.
-- Accepted appeals are resolved through the existing grading endpoint, which records
-- old_score/new_score here for the audit trail.
CREATE TABLE IF NOT EXISTS "GradeAppeals" (
  "id"               BIGSERIAL PRIMARY KEY,
  "submission_id"    INT NOT NULL UNIQUE REFERENCES "Submissions"("id") ON DELETE CASCADE,
  "student_id"       INT NOT NULL REFERENCES "Users"("id"),
  "reason"           TEXT NOT NULL,
  "status"           VARCHAR(20) NOT NULL DEFAULT 'open',
  "lecturer_comment" TEXT,
  "old_score"        DECIMAL(5,2),
  "new_score"        DECIMAL(5,2),
  "requested_at"     TIMESTAMP NOT NULL DEFAULT NOW(),
  "resolved_at"      TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "IX_GradeAppeals_status" ON "GradeAppeals" ("status");