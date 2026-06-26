-- Migration: Add admin role support and user active status
USE AssignmentSystem;
GO

-- Drop existing CHECK constraint on role column
DECLARE @constraintName NVARCHAR(128);
SELECT @constraintName = name
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('Users')
  AND COL_NAME(parent_object_id, parent_column_id) = 'role';

IF @constraintName IS NOT NULL
  EXEC('ALTER TABLE Users DROP CONSTRAINT ' + @constraintName);
GO

-- Re-add with admin role included
ALTER TABLE Users ADD CONSTRAINT CK_Users_role CHECK (role IN ('student', 'lecturer', 'admin'));
GO

-- Add is_active column for user suspension
ALTER TABLE Users ADD is_active BIT DEFAULT 1;
GO

-- Set existing users as active
UPDATE Users SET is_active = 1 WHERE is_active IS NULL;
GO

-- Add admin user (password: admin123)
-- Hash will need to be regenerated via the app on first login
INSERT INTO Users (name, email, password_hash, role, is_verified, is_active)
VALUES ('System Admin', 'admin@university.edu', '$2b$10$placeholder_admin_hash', 'admin', 1, 1);
GO
