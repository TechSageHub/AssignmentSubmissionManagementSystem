-- Migration: Add SubmissionHistory to preserve prior submission versions
-- Guarded so re-running is safe on an already-migrated database.
USE AssignmentSystem;
GO

IF OBJECT_ID('dbo.SubmissionHistory', 'U') IS NULL
BEGIN
    CREATE TABLE SubmissionHistory (
        id INT IDENTITY(1,1) PRIMARY KEY,
        submission_id INT NOT NULL,
        version_number INT NOT NULL,
        file_path NVARCHAR(500) NOT NULL,
        original_name NVARCHAR(255) NOT NULL,
        is_late BIT DEFAULT 0,
        submitted_at DATETIME2 DEFAULT GETDATE(),
        files_json NVARCHAR(MAX),
        CONSTRAINT FK_SubmissionHistory_Submission FOREIGN KEY (submission_id) REFERENCES Submissions(id) ON DELETE CASCADE,
        CONSTRAINT UX_SubmissionHistory_version UNIQUE (submission_id, version_number)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SubmissionHistory_submission_id' AND object_id = OBJECT_ID('SubmissionHistory'))
    CREATE INDEX IX_SubmissionHistory_submission_id ON SubmissionHistory(submission_id);
GO