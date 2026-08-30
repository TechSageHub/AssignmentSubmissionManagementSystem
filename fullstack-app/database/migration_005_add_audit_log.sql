-- Migration: Add audit log table
-- Guarded so re-running is safe on an already-migrated database.
USE AssignmentSystem;
GO

IF OBJECT_ID('dbo.AuditLog', 'U') IS NULL
BEGIN
    CREATE TABLE AuditLog (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_id INT,
        user_name NVARCHAR(100),
        action NVARCHAR(50) NOT NULL,
        entity_type NVARCHAR(50),
        entity_id INT,
        details NVARCHAR(MAX),
        ip_address NVARCHAR(45),
        created_at DATETIME2 DEFAULT GETDATE()
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLog_created_at' AND object_id = OBJECT_ID('AuditLog'))
    CREATE INDEX IX_AuditLog_created_at ON AuditLog(created_at DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLog_user_id' AND object_id = OBJECT_ID('AuditLog'))
    CREATE INDEX IX_AuditLog_user_id ON AuditLog(user_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLog_action' AND object_id = OBJECT_ID('AuditLog'))
    CREATE INDEX IX_AuditLog_action ON AuditLog(action);
GO