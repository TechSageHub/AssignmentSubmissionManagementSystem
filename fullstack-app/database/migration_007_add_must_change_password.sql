-- Migration: Add must_change_password flag to Users
-- Forces users created by an admin/lecturer to set their own password on first login.
-- This file is dual-dialect: the runner (scripts/migrate.js) swallows per-statement errors,
-- so the statement for the "wrong" engine fails harmlessly and the correct one applies.

-- MSSQL variant (errors on PostgreSQL, ignored)
ALTER TABLE Users ADD must_change_password BIT DEFAULT 0;
GO

-- PostgreSQL variant (errors on MSSQL, ignored)
ALTER TABLE Users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;
