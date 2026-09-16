const cron = require('node-cron');
const { query } = require('../config/db');
const { sendDeadlineReminder } = require('../utils/emailHelper');
const { toStoredUtc } = require('../utils/dates');

async function checkDeadlines() {
  try {
    // Boundaries are naive UTC wall-clock strings (matching how due_date is
    // stored), so the comparison is exact on both SQL Server and Postgres
    // regardless of driver/Type conversions.
    const now = toStoredUtc(new Date());
    const in24Hours = toStoredUtc(new Date(Date.now() + 24 * 60 * 60 * 1000));

    // Eligible students: active students in the lecturer's department with matching
    // level and an un-submitted assignment due within 24h, excluding pairs already
    // persisted in ReminderLog. Persisting the log means a restart can never
    // re-send the same reminder. Emails that fail to send are NOT logged, so the
    // next hourly run naturally retries them.
    const { matchesLevel } = require('../utils/academic');

    const result = await query(
      `SELECT a.id AS assignment_id, a.title, a.due_date, a.target_level,
              u.id AS student_id, u.name AS student_name, u.email AS student_email,
              u.level AS student_level, u.department AS student_dept,
              l.department AS lecturer_dept
       FROM Assignments a
       JOIN Users l ON l.id = a.lecturer_id
       CROSS JOIN Users u
       WHERE u.role = 'student'
         AND (u.is_active = 1 OR u.is_active IS NULL)
         AND a.due_date > @now
         AND a.due_date <= @in24Hours
         AND (
           l.department IS NULL
           OR LOWER(LTRIM(RTRIM(u.department))) = LOWER(LTRIM(RTRIM(l.department)))
         )
         AND NOT EXISTS (
           SELECT 1 FROM Submissions s
           WHERE s.assignment_id = a.id AND s.student_id = u.id
         )
         AND NOT EXISTS (
           SELECT 1 FROM ReminderLog rl
           WHERE rl.assignment_id = a.id AND rl.student_id = u.id
         )`,
      { now, in24Hours }
    );

    for (const row of result.recordset) {
      if (!matchesLevel(row.student_level, row.target_level)) {
        continue;
      }
      try {
        await sendDeadlineReminder(row.student_email, row.student_name, row.title, row.due_date);
        await query(
          'INSERT INTO ReminderLog (assignment_id, student_id) VALUES (@assignmentId, @studentId)',
          { assignmentId: row.assignment_id, studentId: row.student_id }
        );
      } catch (err) {
        console.error(`Failed to send reminder to ${row.student_email}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Reminder service error:', err.message);
  }
}

function start() {
  // Run every hour
  cron.schedule('0 * * * *', () => {
    checkDeadlines();
  });
  console.log('Reminder service started (hourly check)');
}

module.exports = { start, checkDeadlines };