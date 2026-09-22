-- GradeAppeals: single-round, post-release grade appeal loop.
-- One row per appealed submission (UNIQUE submission_id). Status: open|accepted|rejected.
-- Accepted appeals are resolved through the existing grading endpoint, which records
-- old_score/new_score here for the audit trail.
IF OBJECT_ID('dbo.GradeAppeals', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.GradeAppeals (
    id               INT IDENTITY(1,1) PRIMARY KEY,
    submission_id    INT NOT NULL UNIQUE,
    student_id       INT NOT NULL,
    reason           NVARCHAR(MAX) NOT NULL,
    status           NVARCHAR(20)  NOT NULL DEFAULT 'open', -- open|accepted|rejected
    lecturer_comment NVARCHAR(MAX)  NULL,
    old_score        DECIMAL(5,2)   NULL,
    new_score        DECIMAL(5,2)   NULL,
    requested_at     DATETIME2      NOT NULL DEFAULT GETDATE(),
    resolved_at      DATETIME2      NULL,
    CONSTRAINT FK_GradeAppeals_Submission FOREIGN KEY (submission_id) REFERENCES dbo.Submissions(id) ON DELETE CASCADE,
    CONSTRAINT FK_GradeAppeals_User FOREIGN KEY (student_id) REFERENCES dbo.Users(id)
  );

  CREATE INDEX IX_GradeAppeals_status ON dbo.GradeAppeals (status);
END
GO