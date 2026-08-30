-- Migration: Add ReminderLog table to persist deadline-reminder deliveries.
-- Prevents duplicate reminders to the same student/assignment across server restarts.
-- Guarded so re-running is safe on an already-migrated database.
USE AssignmentSystem;
GO

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