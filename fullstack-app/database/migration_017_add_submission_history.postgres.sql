-- Migration: Add SubmissionHistory to preserve prior submission versions

CREATE TABLE IF NOT EXISTS SubmissionHistory (
    id SERIAL PRIMARY KEY,
    submission_id INT NOT NULL REFERENCES Submissions(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    is_late BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMP DEFAULT NOW(),
    files_json TEXT,
    CONSTRAINT UX_SubmissionHistory_version UNIQUE (submission_id, version_number)
);

CREATE INDEX IF NOT EXISTS IX_SubmissionHistory_submission_id ON SubmissionHistory(submission_id);