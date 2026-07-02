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
GO

CREATE INDEX IX_SubmissionFiles_submission_id ON SubmissionFiles(submission_id);
GO
