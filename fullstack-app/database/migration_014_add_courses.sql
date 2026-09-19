-- Migration: Add Courses table and link assignments to courses + semester label
-- Guarded so re-running is safe on an already-migrated database.
USE AssignmentSystem;
GO

IF OBJECT_ID('dbo.Courses', 'U') IS NULL
BEGIN
    CREATE TABLE Courses (
        id INT IDENTITY(1,1) PRIMARY KEY,
        code NVARCHAR(20) NOT NULL UNIQUE,
        title NVARCHAR(200) NOT NULL,
        department NVARCHAR(100),
        created_at DATETIME2 DEFAULT GETDATE()
    );
END
GO

IF COL_LENGTH('dbo.Assignments', 'course_id') IS NULL
    ALTER TABLE Assignments ADD course_id INT NULL;
GO

IF COL_LENGTH('dbo.Assignments', 'semester') IS NULL
    ALTER TABLE Assignments ADD semester NVARCHAR(50) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Assignments_Course')
    ALTER TABLE Assignments ADD CONSTRAINT FK_Assignments_Course
        FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE SET NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Assignments_course_id' AND object_id = OBJECT_ID('Assignments'))
    CREATE INDEX IX_Assignments_course_id ON Assignments(course_id);
GO