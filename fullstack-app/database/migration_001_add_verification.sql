-- Migration: Add email verification columns to Users table
USE AssignmentSystem;
GO

ALTER TABLE Users
ADD
    is_verified BIT DEFAULT 0,
    verification_token NVARCHAR(255),
    verification_token_expires DATETIME2;
GO

-- Set existing users as verified (they registered before this feature)
UPDATE Users SET is_verified = 1 WHERE is_verified IS NULL;
GO
