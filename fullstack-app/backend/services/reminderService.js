const cron = require('node-cron');
const { query } = require('../config/db');
const { sendDeadlineReminder } = require('../utils/emailHelper');

// Track which reminders have been sent to avoid duplicates
const reminded = new Set();

async function checkDeadlines() {
  try {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const result = await query(
      `SELECT a.id AS assignment_id, a.title, a.due_date,
              u.id AS student_id, u.name AS student_name, u.email AS student_email
       FROM Assignments a
       CROSS JOIN Users u
       WHERE u.role = 'student'
         AND (u.is_active = 1 OR u.is_active IS NULL)
         AND a.due_date > @now
         AND a.due_date <= @in24Hours
         AND NOT EXISTS (
           SELECT 1 FROM Submissions s
           WHERE s.assignment_id = a.id AND s.student_id = u.id
         )`,
      { now, in24Hours }
    );

    for (const row of result.recordset) {
      const key = `${row.assignment_id}-${row.student_id}`;
      if (reminded.has(key)) continue;

      try {
        await sendDeadlineReminder(row.student_email, row.student_name, row.title, row.due_date);
        reminded.add(key);
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

module.exports = { start };
