-- Seed data for testing
USE AssignmentSystem;
GO

-- Sample lecturer (password: password123)
INSERT INTO Users (name, email, password_hash, role)
VALUES ('Dr. Smith', 'smith@university.edu', '$2a$10$POQYe2.RmRLhNWVkfocU9enTjSKSXR6Zg.FJ/QId.cX8CZuMT2G76', 'lecturer');
GO

-- Sample student (password: password123)
INSERT INTO Users (name, email, password_hash, role)
VALUES ('Jane Doe', 'jane@university.edu', '$2a$10$POQYe2.RmRLhNWVkfocU9enTjSKSXR6Zg.FJ/QId.cX8CZuMT2G76', 'student');
GO
