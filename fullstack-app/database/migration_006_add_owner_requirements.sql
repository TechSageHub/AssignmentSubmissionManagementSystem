-- Migration: Add owner-required fields, notifications, and system config
-- Username is added without UNIQUE first, backfilled, then the UNIQUE constraint is added.
-- Guarded so re-running is safe on an already-migrated database.
USE AssignmentSystem;
GO

-- 1. Add columns to Users table
IF COL_LENGTH('dbo.Users', 'username') IS NULL
    ALTER TABLE Users ADD username NVARCHAR(100) NULL;
GO

IF COL_LENGTH('dbo.Users', 'student_id') IS NULL
    ALTER TABLE Users ADD student_id NVARCHAR(50) NULL;
GO

IF COL_LENGTH('dbo.Users', 'staff_id') IS NULL
    ALTER TABLE Users ADD staff_id NVARCHAR(50) NULL;
GO

IF COL_LENGTH('dbo.Users', 'department') IS NULL
    ALTER TABLE Users ADD department NVARCHAR(100) NULL;
GO

IF COL_LENGTH('dbo.Users', 'programme') IS NULL
    ALTER TABLE Users ADD programme NVARCHAR(100) NULL;
GO

IF COL_LENGTH('dbo.Users', 'level') IS NULL
    ALTER TABLE Users ADD level NVARCHAR(20) NULL;
GO

IF COL_LENGTH('dbo.Users', 'phone') IS NULL
    ALTER TABLE Users ADD phone NVARCHAR(20) NULL;
GO

-- Auto-generate username for existing users (prefix of email before @)
IF COL_LENGTH('dbo.Users', 'username') IS NOT NULL
    UPDATE Users
    SET username = LOWER(LEFT(email, CHARINDEX('@', email) - 1))
    WHERE username IS NULL;
GO

-- De-duplicate usernames by appending id
IF COL_LENGTH('dbo.Users', 'username') IS NOT NULL
    UPDATE Users
    SET username = username + CAST(id AS NVARCHAR)
    WHERE username IN (
        SELECT username FROM Users GROUP BY username HAVING COUNT(*) > 1
    );
GO

-- Now add UNIQUE constraint after all values are populated
IF COL_LENGTH('dbo.Users', 'username') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM sys.key_constraints
    WHERE type = 'UQ' AND name = 'UQ_Users_username' AND parent_object_id = OBJECT_ID('Users')
)
    ALTER TABLE Users ADD CONSTRAINT UQ_Users_username UNIQUE (username);
GO

-- 2. Add columns to Assignments table
IF COL_LENGTH('dbo.Assignments', 'course_code') IS NULL
    ALTER TABLE Assignments ADD course_code NVARCHAR(20) NULL;
GO

IF COL_LENGTH('dbo.Assignments', 'course_title') IS NULL
    ALTER TABLE Assignments ADD course_title NVARCHAR(200) NULL;
GO

-- 3. Create Notifications table
IF OBJECT_ID('dbo.Notifications', 'U') IS NULL
BEGIN
    CREATE TABLE Notifications (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT NOT NULL,
        type NVARCHAR(50) NOT NULL,
        title NVARCHAR(200) NOT NULL,
        message NVARCHAR(MAX),
        link NVARCHAR(500),
        is_read BIT DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_Notifications_User FOREIGN KEY (user_id) REFERENCES Users(id)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Notifications_user_id' AND object_id = OBJECT_ID('Notifications'))
    CREATE INDEX IX_Notifications_user_id ON Notifications(user_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Notifications_unread' AND object_id = OBJECT_ID('Notifications'))
    CREATE INDEX IX_Notifications_unread ON Notifications(user_id, is_read);
GO

-- 4. Create SystemConfig table
IF OBJECT_ID('dbo.SystemConfig', 'U') IS NULL
BEGIN
    CREATE TABLE SystemConfig (
        [key] NVARCHAR(100) PRIMARY KEY,
        [value] NVARCHAR(MAX)
    );
END
GO

-- Seed default system config (skip if the table already has rows)
IF NOT EXISTS (SELECT 1 FROM SystemConfig)
    INSERT INTO SystemConfig ([key], [value]) VALUES
        ('institution_name', 'Federal Polytechnic Ilaro'),
        ('institution_short_name', 'FPI'),
        ('institution_logo', '/fpi-logo.png'),
        ('institution_address', 'PMB 50, Ilaro, Ogun State, Nigeria'),
        ('institution_email', 'info@federalpolyilaro.edu.ng'),
        ('institution_phone', '+234-803-000-0000'),
        ('about_purpose', 'The Assignment Submission System provides a centralized digital platform for students and lecturers at Federal Polytechnic Ilaro to manage the complete lifecycle of academic assignments.'),
        ('about_objectives', '1. Provide a secure and standardized channel for assignment submission\n2. Enable lecturers to create, manage, and grade assignments efficiently\n3. Give students real-time access to grades and feedback\n4. Automate deadline enforcement and late submission detection\n5. Maintain organized records of all submissions and grades'),
        ('about_benefits', 'Students can submit assignments from anywhere, track deadlines, and view grades instantly. Lecturers save time with streamlined grading and automated notifications. The institution benefits from organized digital records and reduced administrative overhead.');
GO