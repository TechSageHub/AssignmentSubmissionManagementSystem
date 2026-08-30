-- Migration: Add email verification columns to Users table
-- Guarded so re-running is safe on an already-migrated database.
USE AssignmentSystem;
GO

IF COL_LENGTH('dbo.Users', 'is_verified') IS NULL
    ALTER TABLE Users ADD is_verified BIT DEFAULT 0;
GO

IF COL_LENGTH('dbo.Users', 'verification_token') IS NULL
    ALTER TABLE Users ADD verification_token NVARCHAR(255);
GO

IF COL_LENGTH('dbo.Users', 'verification_token_expires') IS NULL
    ALTER TABLE Users ADD verification_token_expires DATETIME2;
GO

-- Set existing users as verified (they registered before this feature)
IF COL_LENGTH('dbo.Users', 'is_verified') IS NOT NULL
    UPDATE Users SET is_verified = 1 WHERE is_verified IS NULL;
GO