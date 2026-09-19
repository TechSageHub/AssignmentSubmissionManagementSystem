-- Migration: Add publish_date to Assignments for scheduled publishing

ALTER TABLE Assignments ADD COLUMN IF NOT EXISTS publish_date TIMESTAMP;