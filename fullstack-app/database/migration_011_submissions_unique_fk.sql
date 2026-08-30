-- Migration: Submissions uniqueness + FK cascade behavior.
-- 1. Grades -> Submissions       : ON DELETE CASCADE  (re-submission after grading must be allowed)
-- 2. Submissions -> Assignments  : ON DELETE CASCADE  (deleting an assignment cleans up submissions)
-- 3. Submissions                  : UNIQUE (assignment_id, student_id)  (prevents dup race rows)
-- Guarded so re-running is safe on an already-migrated database.
USE AssignmentSystem;
GO

-- 1a) Drop any existing FK from Grades.submission_id (regardless of name)
DECLARE @gconst NVARCHAR(128);
SELECT @gconst = fk.name
FROM sys.foreign_keys fk
JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
JOIN sys.columns c ON c.object_id = fkc.parent_object_id AND c.column_id = fkc.parent_column_id
JOIN sys.tables t ON t.object_id = fk.parent_object_id
WHERE t.name = 'Grades' AND c.name = 'submission_id';
IF @gconst IS NOT NULL
    EXEC('ALTER TABLE Grades DROP CONSTRAINT [' + @gconst + ']');
GO

-- 1b) Re-add with cascade
IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Grades_Submission'
)
    ALTER TABLE Grades ADD CONSTRAINT FK_Grades_Submission
        FOREIGN KEY (submission_id) REFERENCES Submissions(id) ON DELETE CASCADE;
GO

-- 2a) Drop any existing FK from Submissions.assignment_id (regardless of name)
DECLARE @sconst NVARCHAR(128);
SELECT @sconst = fk.name
FROM sys.foreign_keys fk
JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
JOIN sys.columns c ON c.object_id = fkc.parent_object_id AND c.column_id = fkc.parent_column_id
JOIN sys.tables t ON t.object_id = fk.parent_object_id
WHERE t.name = 'Submissions' AND c.name = 'assignment_id';
IF @sconst IS NOT NULL
    EXEC('ALTER TABLE Submissions DROP CONSTRAINT [' + @sconst + ']');
GO

-- 2b) Re-add with cascade
IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Submissions_Assignment'
)
    ALTER TABLE Submissions ADD CONSTRAINT FK_Submissions_Assignment
        FOREIGN KEY (assignment_id) REFERENCES Assignments(id) ON DELETE CASCADE;
GO

-- 3) Deduplicate submissions (keep the latest per assignment+student), then add the unique.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Submissions_assignment_student' AND object_id = OBJECT_ID('Submissions'))
BEGIN
    WITH ranked AS (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY assignment_id, student_id ORDER BY id DESC) AS rn
        FROM Submissions
    )
    DELETE FROM ranked WHERE rn > 1;

    ALTER TABLE Submissions ADD CONSTRAINT UX_Submissions_assignment_student UNIQUE (assignment_id, student_id);
END
GO