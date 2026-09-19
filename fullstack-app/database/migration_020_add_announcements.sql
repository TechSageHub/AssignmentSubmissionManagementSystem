-- Migration: Create Announcements table
USE AssignmentSystem;
GO

IF OBJECT_ID('dbo.Announcements', 'U') IS NULL
CREATE TABLE Announcements (
    id INT IDENTITY(1,1) PRIMARY KEY,
    title NVARCHAR(200) NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    created_by INT NOT NULL,
    target_role NVARCHAR(20) NOT NULL DEFAULT 'all',
    target_department NVARCHAR(100) NULL,
    target_level NVARCHAR(50) NULL,
    published_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Announcements_CreatedBy FOREIGN KEY (created_by) REFERENCES Users(id) ON DELETE CASCADE
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Announcements_published_at' AND object_id = OBJECT_ID('Announcements'))
    CREATE INDEX IX_Announcements_published_at ON Announcements(published_at);
GO