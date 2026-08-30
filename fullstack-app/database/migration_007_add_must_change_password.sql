-- Migration: Add must_change_password flag to Users
-- Forces users created by an admin/lecturer to set their own password on first login.
-- Guarded so re-running is safe on an already-migrated database.
USE AssignmentSystem;
GO

IF COL_LENGTH('dbo.Users', 'must_change_password') IS NULL
    ALTER TABLE Users ADD must_change_password BIT DEFAULT 0;
GO