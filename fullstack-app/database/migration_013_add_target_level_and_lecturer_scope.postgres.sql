-- Migration: Add target_level to Assignments and level_scope to Users
ALTER TABLE Assignments ADD COLUMN IF NOT EXISTS target_level VARCHAR(50);
ALTER TABLE Users ADD COLUMN IF NOT EXISTS level_scope VARCHAR(50);
