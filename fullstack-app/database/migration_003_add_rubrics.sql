-- Migration: Add rubric and grade criteria tables
USE AssignmentSystem;
GO

-- Rubric criteria template for an assignment
CREATE TABLE RubricCriteria (
    id INT IDENTITY(1,1) PRIMARY KEY,
    assignment_id INT NOT NULL,
    name NVARCHAR(200) NOT NULL,
    max_score DECIMAL(5,2) NOT NULL CHECK (max_score > 0),
    sort_order INT NOT NULL DEFAULT 0,
    CONSTRAINT FK_RubricCriteria_Assignment FOREIGN KEY (assignment_id) REFERENCES Assignments(id) ON DELETE CASCADE
);
GO

CREATE INDEX IX_RubricCriteria_assignment_id ON RubricCriteria(assignment_id);
GO

-- Per-criterion scores for a grade
CREATE TABLE GradeCriteria (
    id INT IDENTITY(1,1) PRIMARY KEY,
    grade_id INT NOT NULL,
    criteria_id INT NOT NULL,
    score DECIMAL(5,2) NOT NULL CHECK (score >= 0),
    CONSTRAINT FK_GradeCriteria_Grade FOREIGN KEY (grade_id) REFERENCES Grades(id) ON DELETE CASCADE,
    CONSTRAINT FK_GradeCriteria_Criteria FOREIGN KEY (criteria_id) REFERENCES RubricCriteria(id)
);
GO

CREATE INDEX IX_GradeCriteria_grade_id ON GradeCriteria(grade_id);
GO
