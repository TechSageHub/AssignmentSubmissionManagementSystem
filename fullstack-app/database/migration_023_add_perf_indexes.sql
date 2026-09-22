-- Migration 023: performance indexes + drift reconciliation
-- Adds missing hot-path indexes; all statements are idempotent.

-- Assignments hot paths (reminder cron, publish gate, lecturer scope)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Assignments_due_date' AND object_id = OBJECT_ID('Assignments'))
    CREATE INDEX IX_Assignments_due_date ON Assignments(due_date);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Assignments_publish_date' AND object_id = OBJECT_ID('Assignments'))
    CREATE INDEX IX_Assignments_publish_date ON Assignments(publish_date);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Assignments_lecturer_due' AND object_id = OBJECT_ID('Assignments'))
    CREATE INDEX IX_Assignments_lecturer_due ON Assignments(lecturer_id, due_date);
GO

-- Grades release gate
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Grades_released_at' AND object_id = OBJECT_ID('Grades'))
    CREATE INDEX IX_Grades_released_at ON Grades(released_at);
GO

-- Notifications pagination
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Notifications_user_created' AND object_id = OBJECT_ID('Notifications'))
    CREATE INDEX IX_Notifications_user_created ON Notifications(user_id, created_at DESC);
GO

-- AuditLog entity lookup
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLog_entity' AND object_id = OBJECT_ID('AuditLog'))
    CREATE INDEX IX_AuditLog_entity ON AuditLog(entity_type, entity_id);
GO

-- Announcements targeting
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Announcements_target' AND object_id = OBJECT_ID('Announcements'))
    CREATE INDEX IX_Announcements_target ON Announcements(target_role, target_department, target_level);
GO

-- Users search fallback (name/email) - helps admin list search
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_name_email' AND object_id = OBJECT_ID('Users'))
    CREATE INDEX IX_Users_name_email ON Users(name, email);
GO

-- StorageBlobs cleanup
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_StorageBlobs_created_at' AND object_id = OBJECT_ID('StorageBlobs'))
    CREATE INDEX IX_StorageBlobs_created_at ON StorageBlobs(created_at);
GO
