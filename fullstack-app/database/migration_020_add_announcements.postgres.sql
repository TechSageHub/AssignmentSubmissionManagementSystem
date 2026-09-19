-- Migration: Create Announcements table

CREATE TABLE IF NOT EXISTS Announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    created_by INT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    target_role VARCHAR(20) NOT NULL DEFAULT 'all',
    target_department VARCHAR(100),
    target_level VARCHAR(50),
    published_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS IX_Announcements_published_at ON Announcements(published_at);