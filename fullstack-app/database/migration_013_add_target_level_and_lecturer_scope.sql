-- Migration: Add target_level to Assignments and level_scope to Users
-- Guarded so re-running is safe on an already-migrated database.
USE AssignmentSystem;
GO

IF COL_LENGTH('dbo.Assignments', 'target_level') IS NULL
    ALTER TABLE Assignments ADD target_level NVARCHAR(50) NULL;
GO

IF COL_LENGTH('dbo.Users', 'level_scope') IS NULL
    ALTER TABLE Users ADD level_scope NVARCHAR(50) NULL;
GO
