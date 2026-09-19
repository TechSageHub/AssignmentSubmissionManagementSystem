-- Migration: Add weight to rubric criteria for weighted grading

ALTER TABLE RubricCriteria ADD COLUMN IF NOT EXISTS weight DECIMAL(5,2);