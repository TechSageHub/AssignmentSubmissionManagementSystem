-- Assignment Submission and Management System - Database Schema
-- Microsoft SQL Server
-- Authoritative baseline: a fresh database can be built from this file alone.
-- It already includes everything the incremental migrations add (see migrations/).
-- All statements are guarded so re-running this file is safe.

IF DB_ID('AssignmentSystem') IS NULL
    CREATE DATABASE AssignmentSystem;
GO

USE AssignmentSystem;
GO

-- ================= Users =================
IF OBJECT_ID('dbo.Users', 'U') IS NULL
BEGIN
    CREATE TABLE Users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        email NVARCHAR(255) NOT NULL UNIQUE,
        password_hash NVARCHAR(255) NOT NULL,
        role NVARCHAR(20) NOT NULL CHECK (role IN ('student', 'lecturer', 'admin')),
        is_verified BIT DEFAULT 0,
        verification_token NVARCHAR(255),
        verification_token_expires DATETIME2,
        is_active BIT DEFAULT 1,
        username NVARCHAR(100) UNIQUE,
        student_id NVARCHAR(50),
        staff_id NVARCHAR(50),
        department NVARCHAR(100),
        programme NVARCHAR(100),
        level NVARCHAR(20),
        phone NVARCHAR(20),
        must_change_password BIT DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_email' AND object_id = OBJECT_ID('Users'))
    CREATE INDEX IX_Users_email ON Users(email);
GO

-- ================= Assignments =================
IF OBJECT_ID('dbo.Assignments', 'U') IS NULL
BEGIN
    CREATE TABLE Assignments (
        id INT IDENTITY(1,1) PRIMARY KEY,
        lecturer_id INT NOT NULL,
        title NVARCHAR(200) NOT NULL,
        description NVARCHAR(MAX),
        due_date DATETIME2 NOT NULL,
        file_path NVARCHAR(500),
        course_code NVARCHAR(20),
        course_title NVARCHAR(200),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_Assignments_Lecturer FOREIGN KEY (lecturer_id) REFERENCES Users(id)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Assignments_lecturer_id' AND object_id = OBJECT_ID('Assignments'))
    CREATE INDEX IX_Assignments_lecturer_id ON Assignments(lecturer_id);
GO

-- ================= Submissions =================
IF OBJECT_ID('dbo.Submissions', 'U') IS NULL
BEGIN
    CREATE TABLE Submissions (
        id INT IDENTITY(1,1) PRIMARY KEY,
        assignment_id INT NOT NULL,
        student_id INT NOT NULL,
        file_path NVARCHAR(500) NOT NULL,
        original_name NVARCHAR(255) NOT NULL,
        submitted_at DATETIME2 DEFAULT GETDATE(),
        is_late BIT DEFAULT 0,
        updated_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_Submissions_Assignment FOREIGN KEY (assignment_id) REFERENCES Assignments(id) ON DELETE CASCADE,
        CONSTRAINT FK_Submissions_Student FOREIGN KEY (student_id) REFERENCES Users(id),
        CONSTRAINT UX_Submissions_assignment_student UNIQUE (assignment_id, student_id)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Submissions_assignment_id' AND object_id = OBJECT_ID('Submissions'))
    CREATE INDEX IX_Submissions_assignment_id ON Submissions(assignment_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Submissions_student_id' AND object_id = OBJECT_ID('Submissions'))
    CREATE INDEX IX_Submissions_student_id ON Submissions(student_id);
GO

-- ================= SubmissionFiles =================
IF OBJECT_ID('dbo.SubmissionFiles', 'U') IS NULL
BEGIN
    CREATE TABLE SubmissionFiles (
        id INT IDENTITY(1,1) PRIMARY KEY,
        submission_id INT NOT NULL,
        file_path NVARCHAR(500) NOT NULL,
        original_name NVARCHAR(255) NOT NULL,
        file_size INT DEFAULT 0,
        mime_type NVARCHAR(255),
        uploaded_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_SubmissionFiles_Submission FOREIGN KEY (submission_id) REFERENCES Submissions(id) ON DELETE CASCADE
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SubmissionFiles_submission_id' AND object_id = OBJECT_ID('SubmissionFiles'))
    CREATE INDEX IX_SubmissionFiles_submission_id ON SubmissionFiles(submission_id);
GO

-- ================= Grades =================
IF OBJECT_ID('dbo.Grades', 'U') IS NULL
BEGIN
    CREATE TABLE Grades (
        id INT IDENTITY(1,1) PRIMARY KEY,
        submission_id INT NOT NULL UNIQUE,
        score DECIMAL(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
        feedback NVARCHAR(MAX),
        graded_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_Grades_Submission FOREIGN KEY (submission_id) REFERENCES Submissions(id) ON DELETE CASCADE
    );
END
GO

-- ================= Rubrics =================
IF OBJECT_ID('dbo.RubricCriteria', 'U') IS NULL
BEGIN
    CREATE TABLE RubricCriteria (
        id INT IDENTITY(1,1) PRIMARY KEY,
        assignment_id INT NOT NULL,
        name NVARCHAR(200) NOT NULL,
        max_score DECIMAL(5,2) NOT NULL CHECK (max_score > 0),
        sort_order INT NOT NULL DEFAULT 0,
        CONSTRAINT FK_RubricCriteria_Assignment FOREIGN KEY (assignment_id) REFERENCES Assignments(id) ON DELETE CASCADE
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_RubricCriteria_assignment_id' AND object_id = OBJECT_ID('RubricCriteria'))
    CREATE INDEX IX_RubricCriteria_assignment_id ON RubricCriteria(assignment_id);
GO

IF OBJECT_ID('dbo.GradeCriteria', 'U') IS NULL
BEGIN
    CREATE TABLE GradeCriteria (
        id INT IDENTITY(1,1) PRIMARY KEY,
        grade_id INT NOT NULL,
        criteria_id INT NOT NULL,
        score DECIMAL(5,2) NOT NULL CHECK (score >= 0),
        CONSTRAINT FK_GradeCriteria_Grade FOREIGN KEY (grade_id) REFERENCES Grades(id) ON DELETE CASCADE,
        CONSTRAINT FK_GradeCriteria_Criteria FOREIGN KEY (criteria_id) REFERENCES RubricCriteria(id),
        CONSTRAINT UX_GradeCriteria_grade_criteria UNIQUE (grade_id, criteria_id)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_GradeCriteria_grade_id' AND object_id = OBJECT_ID('GradeCriteria'))
    CREATE INDEX IX_GradeCriteria_grade_id ON GradeCriteria(grade_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_GradeCriteria_criteria_id' AND object_id = OBJECT_ID('GradeCriteria'))
    CREATE INDEX IX_GradeCriteria_criteria_id ON GradeCriteria(criteria_id);
GO

-- ================= GroupMembers =================
IF OBJECT_ID('dbo.GroupMembers', 'U') IS NULL
BEGIN
    CREATE TABLE GroupMembers (
        id INT IDENTITY(1,1) PRIMARY KEY,
        submission_id INT NOT NULL,
        user_id INT NOT NULL,
        CONSTRAINT FK_GroupMembers_Submission FOREIGN KEY (submission_id) REFERENCES Submissions(id) ON DELETE CASCADE,
        CONSTRAINT FK_GroupMembers_User FOREIGN KEY (user_id) REFERENCES Users(id),
        CONSTRAINT UQ_GroupMembers UNIQUE (submission_id, user_id)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_GroupMembers_submission_id' AND object_id = OBJECT_ID('GroupMembers'))
    CREATE INDEX IX_GroupMembers_submission_id ON GroupMembers(submission_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_GroupMembers_user_id' AND object_id = OBJECT_ID('GroupMembers'))
    CREATE INDEX IX_GroupMembers_user_id ON GroupMembers(user_id);
GO

-- ================= AuditLog =================
IF OBJECT_ID('dbo.AuditLog', 'U') IS NULL
BEGIN
    CREATE TABLE AuditLog (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT,
        user_name NVARCHAR(100),
        action NVARCHAR(50) NOT NULL,
        entity_type NVARCHAR(50),
        entity_id INT,
        details NVARCHAR(MAX),
        ip_address NVARCHAR(45),
        created_at DATETIME2 DEFAULT GETDATE()
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLog_created_at' AND object_id = OBJECT_ID('AuditLog'))
    CREATE INDEX IX_AuditLog_created_at ON AuditLog(created_at DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLog_user_id' AND object_id = OBJECT_ID('AuditLog'))
    CREATE INDEX IX_AuditLog_user_id ON AuditLog(user_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLog_action' AND object_id = OBJECT_ID('AuditLog'))
    CREATE INDEX IX_AuditLog_action ON AuditLog(action);
GO

-- ================= Notifications =================
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

-- ================= ReminderLog =================
-- Records which deadline reminders have been sent, so the hourly cron can never
-- re-send to the same student/assignment even after a server restart.
IF OBJECT_ID('dbo.ReminderLog', 'U') IS NULL
BEGIN
    CREATE TABLE ReminderLog (
        id INT IDENTITY(1,1) PRIMARY KEY,
        assignment_id INT NOT NULL,
        student_id INT NOT NULL,
        sent_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_ReminderLog_Assignment FOREIGN KEY (assignment_id) REFERENCES Assignments(id) ON DELETE CASCADE,
        CONSTRAINT FK_ReminderLog_Student FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE CASCADE,
        CONSTRAINT UQ_ReminderLog UNIQUE (assignment_id, student_id)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ReminderLog_assignment_id' AND object_id = OBJECT_ID('ReminderLog'))
    CREATE INDEX IX_ReminderLog_assignment_id ON ReminderLog(assignment_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ReminderLog_student_id' AND object_id = OBJECT_ID('ReminderLog'))
    CREATE INDEX IX_ReminderLog_student_id ON ReminderLog(student_id);
GO

-- ================= SystemConfig =================
IF OBJECT_ID('dbo.SystemConfig', 'U') IS NULL
BEGIN
    CREATE TABLE SystemConfig (
        [key] NVARCHAR(100) PRIMARY KEY,
        [value] NVARCHAR(MAX)
    );
END
GO

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