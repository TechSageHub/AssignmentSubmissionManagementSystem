-- Migration: Add StorageBlobs table for zero-credential binary file persistence.
CREATE TABLE IF NOT EXISTS "StorageBlobs" (
    "key" VARCHAR(500) PRIMARY KEY,
    "content_type" VARCHAR(255) NULL,
    "file_size" INT NOT NULL DEFAULT 0,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMP DEFAULT NOW()
);
