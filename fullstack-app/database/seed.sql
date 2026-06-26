-- Seed data for testing
USE AssignmentSystem;
GO

-- Sample lecturer (password: password123)
INSERT INTO Users (name, email, password_hash, role)
VALUES ('Dr. Smith', 'smith@university.edu', '$2b$10$placeholder_lecturer_hash', 'lecturer');
GO

-- Sample student (password: password123)
INSERT INTO Users (name, email, password_hash, role)
VALUES ('Jane Doe', 'jane@university.edu', '$2b$10$placeholder_student_hash', 'student');
GO
