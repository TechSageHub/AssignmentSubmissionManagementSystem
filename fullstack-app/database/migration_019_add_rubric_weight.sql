-- Migration: Add weight to rubric criteria for weighted grading
USE AssignmentSystem;
GO

IF COL_LENGTH('dbo.RubricCriteria', 'weight') IS NULL
    ALTER TABLE RubricCriteria ADD weight DECIMAL(5,2) NULL;
GO