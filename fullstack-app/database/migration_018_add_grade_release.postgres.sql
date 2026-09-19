-- Migration: Add released_at to Grades for grade release control

ALTER TABLE Grades ADD COLUMN IF NOT EXISTS released_at TIMESTAMP;