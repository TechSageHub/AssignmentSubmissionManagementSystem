-- Migration: Submissions uniqueness + FK cascade behavior.
-- 1. Grades -> Submissions       : ON DELETE CASCADE  (re-submission after grading must be allowed)
-- 2. Submissions -> Assignments  : ON DELETE CASCADE  (deleting an assignment cleans up submissions)
-- 3. Submissions                  : UNIQUE (assignment_id, student_id)  (prevents dup race rows)
-- Runs once, journaled by name like every other Postgres migration.
-- The FKs use Postgres' auto-generated names from schema.postgres.sql (derived
-- from the table/column); DROP IF EXISTS keeps this safe on already-migrated DBs.

ALTER TABLE Grades DROP CONSTRAINT IF EXISTS grades_submission_id_fkey,
                     ADD CONSTRAINT FK_Grades_Submission FOREIGN KEY (submission_id) REFERENCES Submissions(id) ON DELETE CASCADE;

ALTER TABLE Submissions DROP CONSTRAINT IF EXISTS submissions_assignment_id_fkey,
                         ADD CONSTRAINT FK_Submissions_Assignment FOREIGN KEY (assignment_id) REFERENCES Assignments(id) ON DELETE CASCADE;

DELETE FROM Submissions
WHERE id NOT IN (
    SELECT MAX(id) FROM Submissions GROUP BY assignment_id, student_id
);

ALTER TABLE Submissions ADD CONSTRAINT UX_Submissions_assignment_student UNIQUE (assignment_id, student_id);