CREATE TABLE IF NOT EXISTS SubmissionFiles (
    id SERIAL PRIMARY KEY,
    submission_id INT NOT NULL REFERENCES Submissions(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_size INT DEFAULT 0,
    mime_type VARCHAR(255),
    uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS IX_SubmissionFiles_submission_id ON SubmissionFiles(submission_id);
