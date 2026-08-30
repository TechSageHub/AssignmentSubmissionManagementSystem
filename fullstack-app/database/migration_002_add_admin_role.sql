-- Migration: Add admin role support and user active status
-- Guarded so re-running is safe on an already-migrated database.
USE AssignmentSystem;
GO

-- Drop the role CHECK constraint only if it does not already allow 'admin'
IF EXISTS (
    SELECT 1
    FROM sys.check_constraints cc
    WHERE cc.parent_object_id = OBJECT_ID('Users')
      AND COL_NAME(cc.parent_object_id, cc.parent_column_id) = 'role'
      AND cc.definition NOT LIKE '%admin%'
)
BEGIN
    DECLARE @constraintName NVARCHAR(128);
    SELECT @constraintName = cc.name
    FROM sys.check_constraints cc
    WHERE cc.parent_object_id = OBJECT_ID('Users')
      AND COL_NAME(cc.parent_object_id, cc.parent_column_id) = 'role';
    EXEC('ALTER TABLE Users DROP CONSTRAINT ' + @constraintName);
END
GO

-- Re-add with admin role included (skip if a role CHECK already exists)
IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints cc
    WHERE cc.parent_object_id = OBJECT_ID('Users')
      AND COL_NAME(cc.parent_object_id, cc.parent_column_id) = 'role'
)
    ALTER TABLE Users ADD CONSTRAINT CK_Users_role CHECK (role IN ('student', 'lecturer', 'admin'));
GO

-- Add is_active column for user suspension
IF COL_LENGTH('dbo.Users', 'is_active') IS NULL
    ALTER TABLE Users ADD is_active BIT DEFAULT 1;
GO

-- Set existing users as active
IF COL_LENGTH('dbo.Users', 'is_active') IS NOT NULL
    UPDATE Users SET is_active = 1 WHERE is_active IS NULL;
GO

-- Add admin user (skip if already present)
-- Default password: Admin@1234 — reset with `npm run create-admin` after setup.
IF NOT EXISTS (SELECT 1 FROM Users WHERE email = 'admin@university.edu')
    INSERT INTO Users (name, email, password_hash, role, is_verified, is_active)
    VALUES ('System Admin', 'admin@university.edu', '$2a$10$LheOPFECVZJa0zhRY4AtkuSVYTZ17E/1nZGOYs38xC6RDnjFWGbRe', 'admin', 1, 1);
GO