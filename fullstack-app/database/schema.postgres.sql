-- Assignment Submission and Management System - PostgreSQL Schema
-- Run this on Render's PostgreSQL database to initialize it

CREATE TABLE IF NOT EXISTS Users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'lecturer', 'admin')),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    verification_token_expires TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    username VARCHAR(100) UNIQUE,
    student_id VARCHAR(50),
    staff_id VARCHAR(50),
    department VARCHAR(100),
    programme VARCHAR(100),
    level VARCHAR(20),
    phone VARCHAR(20),
    must_change_password BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS IX_Users_email ON Users(email);

CREATE TABLE IF NOT EXISTS Assignments (
    id SERIAL PRIMARY KEY,
    lecturer_id INT NOT NULL REFERENCES Users(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    due_date TIMESTAMP NOT NULL,
    file_path VARCHAR(500),
    course_code VARCHAR(20),
    course_title VARCHAR(200),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS IX_Assignments_lecturer_id ON Assignments(lecturer_id);

CREATE TABLE IF NOT EXISTS Submissions (
    id SERIAL PRIMARY KEY,
    assignment_id INT NOT NULL REFERENCES Assignments(id),
    student_id INT NOT NULL REFERENCES Users(id),
    file_path VARCHAR(500) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    submitted_at TIMESTAMP DEFAULT NOW(),
    is_late BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS IX_Submissions_assignment_id ON Submissions(assignment_id);
CREATE INDEX IF NOT EXISTS IX_Submissions_student_id ON Submissions(student_id);

CREATE TABLE IF NOT EXISTS Grades (
    id SERIAL PRIMARY KEY,
    submission_id INT NOT NULL UNIQUE REFERENCES Submissions(id),
    score DECIMAL(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
    feedback TEXT,
    graded_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS RubricCriteria (
    id SERIAL PRIMARY KEY,
    assignment_id INT NOT NULL REFERENCES Assignments(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    max_score DECIMAL(5,2) NOT NULL CHECK (max_score > 0),
    sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS IX_RubricCriteria_assignment_id ON RubricCriteria(assignment_id);

CREATE TABLE IF NOT EXISTS GradeCriteria (
    id SERIAL PRIMARY KEY,
    grade_id INT NOT NULL REFERENCES Grades(id) ON DELETE CASCADE,
    criteria_id INT NOT NULL REFERENCES RubricCriteria(id),
    score DECIMAL(5,2) NOT NULL CHECK (score >= 0)
);

CREATE INDEX IF NOT EXISTS IX_GradeCriteria_grade_id ON GradeCriteria(grade_id);

CREATE TABLE IF NOT EXISTS GroupMembers (
    id SERIAL PRIMARY KEY,
    submission_id INT NOT NULL REFERENCES Submissions(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES Users(id),
    UNIQUE (submission_id, user_id)
);

CREATE INDEX IF NOT EXISTS IX_GroupMembers_submission_id ON GroupMembers(submission_id);
CREATE INDEX IF NOT EXISTS IX_GroupMembers_user_id ON GroupMembers(user_id);

CREATE TABLE IF NOT EXISTS AuditLog (
    id SERIAL PRIMARY KEY,
    user_id INT,
    user_name VARCHAR(100),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS IX_AuditLog_created_at ON AuditLog(created_at DESC);
CREATE INDEX IF NOT EXISTS IX_AuditLog_user_id ON AuditLog(user_id);
CREATE INDEX IF NOT EXISTS IX_AuditLog_action ON AuditLog(action);

CREATE TABLE IF NOT EXISTS Notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES Users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    link VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS IX_Notifications_user_id ON Notifications(user_id);
CREATE INDEX IF NOT EXISTS IX_Notifications_unread ON Notifications(user_id, is_read);

CREATE TABLE IF NOT EXISTS SystemConfig (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT
);

-- Seed default system config
INSERT INTO SystemConfig (key, value) VALUES
    ('institution_name', 'Federal Polytechnic Ilaro'),
    ('institution_short_name', 'FPI'),
    ('institution_logo', '/fpi-logo.png'),
    ('institution_address', 'PMB 50, Ilaro, Ogun State, Nigeria'),
    ('institution_email', 'info@federalpolyilaro.edu.ng'),
    ('institution_phone', '+234-803-000-0000'),
    ('about_purpose', 'The Assignment Submission System provides a centralized digital platform for students and lecturers at Federal Polytechnic Ilaro to manage the complete lifecycle of academic assignments.'),
    ('about_objectives', '1. Provide a secure and standardized channel for assignment submission\n2. Enable lecturers to create, manage, and grade assignments efficiently\n3. Give students real-time access to grades and feedback\n4. Automate deadline enforcement and late submission detection\n5. Maintain organized records of all submissions and grades'),
    ('about_benefits', 'Students can submit assignments from anywhere, track deadlines, and view grades instantly. Lecturers save time with streamlined grading and automated notifications. The institution benefits from organized digital records and reduced administrative overhead.')
ON CONFLICT (key) DO NOTHING;
