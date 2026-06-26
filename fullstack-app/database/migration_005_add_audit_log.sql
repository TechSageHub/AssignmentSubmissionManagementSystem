-- Migration: Add audit log table
USE AssignmentSystem;
GO

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
GO

CREATE INDEX IX_AuditLog_created_at ON AuditLog(created_at DESC);
CREATE INDEX IX_AuditLog_user_id ON AuditLog(user_id);
CREATE INDEX IX_AuditLog_action ON AuditLog(action);
GO
