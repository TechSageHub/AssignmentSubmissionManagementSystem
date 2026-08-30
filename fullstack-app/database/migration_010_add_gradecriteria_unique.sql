-- Migration: Prevent duplicate GradeCriteria rows on re-grading.
-- Adds a UNIQUE(grade_id, criteria_id) constraint and indexes the criteria FK.
-- Guarded so re-running is safe on an already-migrated database.
USE AssignmentSystem;
GO

-- Deduplicate any existing rows created by re-grading (keep the latest per grade+criteria).
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UX_GradeCriteria_grade_criteria'
      AND object_id = OBJECT_ID('GradeCriteria')
)
BEGIN
    WITH ranked AS (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY grade_id, criteria_id ORDER BY id DESC) AS rn
        FROM GradeCriteria
    )
    DELETE FROM ranked WHERE rn > 1;

    ALTER TABLE GradeCriteria ADD CONSTRAINT UX_GradeCriteria_grade_criteria UNIQUE (grade_id, criteria_id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_GradeCriteria_criteria_id' AND object_id = OBJECT_ID('GradeCriteria'))
    CREATE INDEX IX_GradeCriteria_criteria_id ON GradeCriteria(criteria_id);
GO