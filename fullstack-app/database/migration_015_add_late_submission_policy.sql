-- Migration: Add late-submission policy to Assignments
-- Guarded so re-running is safe on an already-migrated database.
USE AssignmentSystem;
GO

IF COL_LENGTH('dbo.Assignments', 'accept_late_submissions') IS NULL
    ALTER TABLE Assignments ADD accept_late_submissions BIT NOT NULL DEFAULT 1;
GO

IF COL_LENGTH('dbo.Assignments', 'late_cutoff') IS NULL
    ALTER TABLE Assignments ADD late_cutoff DATETIME2 NULL;
GO