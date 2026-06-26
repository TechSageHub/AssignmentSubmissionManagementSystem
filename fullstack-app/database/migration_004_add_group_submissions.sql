-- Migration: Add group submission support
USE AssignmentSystem;
GO

CREATE TABLE GroupMembers (
    id INT IDENTITY(1,1) PRIMARY KEY,
    submission_id INT NOT NULL,
    user_id INT NOT NULL,
    CONSTRAINT FK_GroupMembers_Submission FOREIGN KEY (submission_id) REFERENCES Submissions(id) ON DELETE CASCADE,
    CONSTRAINT FK_GroupMembers_User FOREIGN KEY (user_id) REFERENCES Users(id),
    CONSTRAINT UQ_GroupMembers UNIQUE (submission_id, user_id)
);
GO

CREATE INDEX IX_GroupMembers_submission_id ON GroupMembers(submission_id);
CREATE INDEX IX_GroupMembers_user_id ON GroupMembers(user_id);
GO
