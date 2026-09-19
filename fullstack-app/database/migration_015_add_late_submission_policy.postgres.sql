-- Migration: Add late-submission policy to Assignments

ALTER TABLE Assignments ADD COLUMN IF NOT EXISTS accept_late_submissions BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE Assignments ADD COLUMN IF NOT EXISTS late_cutoff TIMESTAMP;