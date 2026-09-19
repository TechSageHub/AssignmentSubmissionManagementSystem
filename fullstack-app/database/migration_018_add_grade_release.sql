-- Migration: Add released_at to Grades for grade release control
-- Guarded so re-running is safe on an already-migrated database.
USE AssignmentSystem;
GO

IF COL_LENGTH('dbo.Grades', 'released_at') IS NULL
    ALTER TABLE Grades ADD released_at DATETIME2 NULL;
GO