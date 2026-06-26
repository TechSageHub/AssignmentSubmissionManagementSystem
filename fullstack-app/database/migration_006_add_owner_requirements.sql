-- Migration: Add owner-required fields, notifications, and system config
-- Fix: Add username without UNIQUE first, backfill, then add constraint
USE AssignmentSystem;
GO

-- 1. Add columns to Users table (username without UNIQUE constraint to allow NULLs)
ALTER TABLE Users ADD
    username NVARCHAR(100) NULL,
    student_id NVARCHAR(50) NULL,
    staff_id NVARCHAR(50) NULL,
    department NVARCHAR(100) NULL,
    programme NVARCHAR(100) NULL,
    level NVARCHAR(20) NULL,
    phone NVARCHAR(20) NULL;
GO

-- Auto-generate username for existing users (prefix of email before @)
UPDATE Users
SET username = LOWER(LEFT(email, CHARINDEX('@', email) - 1))
WHERE username IS NULL;
GO

-- Handle duplicate usernames by appending id
UPDATE Users
SET username = username + CAST(id AS NVARCHAR)
WHERE username IN (
    SELECT username FROM Users GROUP BY username HAVING COUNT(*) > 1
);
GO

-- Now add UNIQUE constraint after all values are populated
ALTER TABLE Users ADD CONSTRAINT UQ_Users_username UNIQUE (username);
GO

-- 2. Add columns to Assignments table
ALTER TABLE Assignments ADD
    course_code NVARCHAR(20) NULL,
    course_title NVARCHAR(200) NULL;
GO

-- 3. Create Notifications table
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
GO

CREATE INDEX IX_Notifications_user_id ON Notifications(user_id);
CREATE INDEX IX_Notifications_unread ON Notifications(user_id, is_read);
GO

-- 4. Create SystemConfig table
CREATE TABLE SystemConfig (
    [key] NVARCHAR(100) PRIMARY KEY,
    [value] NVARCHAR(MAX)
);
GO

-- Seed default system config
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
