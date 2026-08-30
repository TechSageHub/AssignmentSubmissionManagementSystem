CREATE TABLE IF NOT EXISTS ReminderLog (
    id SERIAL PRIMARY KEY,
    assignment_id INT NOT NULL REFERENCES Assignments(id) ON DELETE CASCADE,
    student_id INT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    sent_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS IX_ReminderLog_assignment_id ON ReminderLog(assignment_id);
CREATE INDEX IF NOT EXISTS IX_ReminderLog_student_id ON ReminderLog(student_id);