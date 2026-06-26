const { sendEmail } = require('../config/email');
const config = require('../config/env');
const baseUrl = config.frontendUrl;

async function sendAssignmentCreated(studentEmail, studentName, assignmentTitle, dueDate, lecturerName) {
  await sendEmail({
    to: studentEmail,
    subject: `New Assignment: ${assignmentTitle}`,
    html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6366f1;">New Assignment Available</h2>
      <p>Hi <strong>${studentName}</strong>,</p>
      <p>Lecturer <strong>${lecturerName}</strong> has posted a new assignment:</p>
      <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3 style="margin: 0 0 8px;">${assignmentTitle}</h3>
        <p style="color: #64748b; font-size: 14px;">Due: <strong>${new Date(dueDate).toLocaleString()}</strong></p>
      </div>
      <p><a href="${baseUrl}/assignments" style="background: #6366f1; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none;">View Assignment</a></p>
      <p style="color: #94a3b8; font-size: 12px;">You are receiving this because you are registered on ASMS.</p>
    </div>`,
  });
}

async function sendSubmissionConfirmation(studentEmail, studentName, assignmentTitle, isLate) {
  await sendEmail({
    to: studentEmail,
    subject: `Submission Received: ${assignmentTitle}`,
    html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6366f1;">Submission Received</h2>
      <p>Hi <strong>${studentName}</strong>,</p>
      <p>Your submission for <strong>${assignmentTitle}</strong> has been received successfully.</p>
      ${isLate ? '<p style="color: #eab308; font-weight: 600;">&#9888; This submission was marked as LATE.</p>' : '<p style="color: #22c55e;">&#10003; Submitted on time.</p>'}
      <p style="color: #94a3b8; font-size: 12px;">You are receiving this because you are registered on ASMS.</p>
    </div>`,
  });
}

async function sendGradeReleased(studentEmail, studentName, assignmentTitle, score, feedback) {
  await sendEmail({
    to: studentEmail,
    subject: `Grade Released: ${assignmentTitle}`,
    html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6366f1;">Grade Released</h2>
      <p>Hi <strong>${studentName}</strong>,</p>
      <p>Your submission for <strong>${assignmentTitle}</strong> has been graded.</p>
      <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center;">
        <div style="font-size: 36px; font-weight: 700; color: ${score >= 50 ? '#22c55e' : '#ef4444'};">${score}%</div>
      </div>
      ${feedback ? `<p><strong>Feedback:</strong> ${feedback}</p>` : ''}
      <p><a href="${baseUrl}/my-submissions" style="background: #6366f1; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none;">View Result</a></p>
      <p style="color: #94a3b8; font-size: 12px;">You are receiving this because you are registered on ASMS.</p>
    </div>`,
  });
}

async function sendDeadlineReminder(studentEmail, studentName, assignmentTitle, dueDate) {
  await sendEmail({
    to: studentEmail,
    subject: `Reminder: ${assignmentTitle} due soon`,
    html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #eab308;">Deadline Reminder</h2>
      <p>Hi <strong>${studentName}</strong>,</p>
      <p>This is a reminder that <strong>${assignmentTitle}</strong> is due in less than 24 hours.</p>
      <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0; font-size: 14px;">Due: <strong>${new Date(dueDate).toLocaleString()}</strong></p>
      </div>
      <p><a href="${baseUrl}/assignments" style="background: #6366f1; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none;">Submit Now</a></p>
      <p style="color: #94a3b8; font-size: 12px;">You are receiving this because you are registered on ASMS.</p>
    </div>`,
  });
}

module.exports = { sendAssignmentCreated, sendSubmissionConfirmation, sendGradeReleased, sendDeadlineReminder };
