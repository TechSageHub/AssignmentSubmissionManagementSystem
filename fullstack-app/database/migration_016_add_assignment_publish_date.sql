-- Migration: Add publish_date to Assignments for scheduled publishing
-- Guarded so re-running is safe on an already-migrated database.
USE AssignmentSystem;
GO

IF COL_LENGTH('dbo.Assignments', 'publish_date') IS NULL
    ALTER TABLE Assignments ADD publish_date DATETIME2 NULL;
GO