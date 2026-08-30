-- Migration: Add group submission support
-- Guarded so re-running is safe on an already-migrated database.
USE AssignmentSystem;
GO

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