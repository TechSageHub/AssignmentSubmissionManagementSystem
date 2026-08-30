-- Migration: Add SubmissionFiles table for multi-file uploads
-- Guarded so re-running is safe on an already-migrated database.
USE AssignmentSystem;
GO

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