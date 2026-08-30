-- Migration: Add StorageBlobs table for zero-credential binary file persistence.
USE AssignmentSystem;
GO

IF OBJECT_ID('dbo.StorageBlobs', 'U') IS NULL
BEGIN
    CREATE TABLE StorageBlobs (
        [key] VARCHAR(500) PRIMARY KEY,
        [content_type] VARCHAR(255) NULL,
        [file_size] INT NOT NULL DEFAULT 0,
        [data] VARBINARY(MAX) NOT NULL,
        [created_at] DATETIME2 DEFAULT GETDATE()
    );
END
GO
