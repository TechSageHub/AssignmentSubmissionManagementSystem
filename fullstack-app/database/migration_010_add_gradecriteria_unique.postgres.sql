-- Migration: Prevent duplicate GradeCriteria rows on re-grading.
-- Adds a UNIQUE(grade_id, criteria_id) constraint and indexes the criteria FK.
-- Runs once, journaled by name like every other Postgres migration.
-- (Postgres accepts the constraint alongside the schema's inline UNIQUE — a
--  second unique index is redundant but harmless on newly scaffolded DBs.)

-- Deduplicate any existing rows created by re-grading (keep the latest per grade+criteria).
DELETE FROM GradeCriteria
WHERE id NOT IN (
    SELECT MAX(id) FROM GradeCriteria GROUP BY grade_id, criteria_id
);

CREATE INDEX IF NOT EXISTS IX_GradeCriteria_criteria_id ON GradeCriteria(criteria_id);

ALTER TABLE GradeCriteria ADD CONSTRAINT UX_GradeCriteria_grade_criteria UNIQUE (grade_id, criteria_id);