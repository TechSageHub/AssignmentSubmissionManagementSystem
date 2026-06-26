-- Assignment Submission and Management System - Database Schema
-- Microsoft SQL Server

CREATE DATABASE AssignmentSystem;
GO

USE AssignmentSystem;
GO

-- Users table
CREATE TABLE Users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    email NVARCHAR(255) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    role NVARCHAR(20) NOT NULL CHECK (role IN ('student', 'lecturer')),
    is_verified BIT DEFAULT 0,
    verification_token NVARCHAR(255),
    verification_token_expires DATETIME2,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
GO

CREATE INDEX IX_Users_email ON Users(email);
GO

-- Assignments table
CREATE TABLE Assignments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    lecturer_id INT NOT NULL,
    title NVARCHAR(200) NOT NULL,
    description NVARCHAR(MAX),
    due_date DATETIME2 NOT NULL,
    file_path NVARCHAR(500),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Assignments_Lecturer FOREIGN KEY (lecturer_id) REFERENCES Users(id)
);
GO

CREATE INDEX IX_Assignments_lecturer_id ON Assignments(lecturer_id);
GO

-- Submissions table
CREATE TABLE Submissions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    assignment_id INT NOT NULL,
    student_id INT NOT NULL,
    file_path NVARCHAR(500) NOT NULL,
    original_name NVARCHAR(255) NOT NULL,
    submitted_at DATETIME2 DEFAULT GETDATE(),
    is_late BIT DEFAULT 0,
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Submissions_Assignment FOREIGN KEY (assignment_id) REFERENCES Assignments(id),
    CONSTRAINT FK_Submissions_Student FOREIGN KEY (student_id) REFERENCES Users(id)
);
GO

CREATE INDEX IX_Submissions_assignment_id ON Submissions(assignment_id);
CREATE INDEX IX_Submissions_student_id ON Submissions(student_id);
GO

-- Grades table
CREATE TABLE Grades (
    id INT IDENTITY(1,1) PRIMARY KEY,
    submission_id INT NOT NULL UNIQUE,
    score DECIMAL(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
    feedback NVARCHAR(MAX),
    graded_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Grades_Submission FOREIGN KEY (submission_id) REFERENCES Submissions(id)
);
GO
