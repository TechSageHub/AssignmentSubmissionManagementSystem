-- Migration: Add Courses table and link assignments to courses + semester label
CREATE TABLE IF NOT EXISTS Courses (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    department VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE Assignments ADD COLUMN IF NOT EXISTS course_id INT REFERENCES Courses(id) ON DELETE SET NULL;
ALTER TABLE Assignments ADD COLUMN IF NOT EXISTS semester VARCHAR(50);

CREATE INDEX IF NOT EXISTS IX_Assignments_course_id ON Assignments(course_id);