const { sendEmail } = require('../config/email');
const outbox = require('../models/emailOutbox');
const config = require('../config/env');
const { parseInputDate } = require('./dates');
const { escapeHtml } = require('./html');

const baseUrl = config.frontendUrl;

function formatDueDate(value) {
  const parsed = parseInputDate(value);
  if (!parsed) return String(value);
  // Always render in UTC so the instant is unambiguous for readers in any zone.
  return `${parsed.toLocaleString('en-GB', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' })} (UTC)`;
}

// Route a message through the durable outbox queue when enabled, else fall
// straight back to a direct SMTP send (keeps the original behavior and leaves
// the 58 pre-queue tests untouched).
async function sendOrEnqueue({ to, subject, html, recipientName }) {
  if (config.email.queueEnabled) {
    await outbox.enqueue({
      recipient_email: to,
      recipient_name: recipientName || null,
      subject,
      body_html: html,
    });
    return;
  }
  await sendEmail({ to, subject, html });
}

async function sendAssignmentCreated(studentEmail, studentName, assignmentTitle, dueDate, lecturerName) {
  await sendOrEnqueue({
    to: studentEmail,
    recipientName: studentName,
    subject: `New Assignment: ${escapeHtml(assignmentTitle)}`,
    html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6366f1;">New Assignment Available</h2>
      <p>Hi <strong>${escapeHtml(studentName)}</strong>,</p>
      <p>Lecturer <strong>${escapeHtml(lecturerName)}</strong> has posted a new assignment:</p>
      <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3 style="margin: 0 0 8px;">${escapeHtml(assignmentTitle)}</h3>
        <p style="color: #64748b; font-size: 14px;">Due: <strong>${formatDueDate(dueDate)}</strong></p>
      </div>
      <p><a href="${baseUrl}/assignments" style="background: #6366f1; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none;">View Assignment</a></p>
      <p style="color: #94a3b8; font-size: 12px;">You are receiving this because you are registered on ASMS.</p>
    </div>`,
  });
}

async function sendSubmissionConfirmation(studentEmail, studentName, assignmentTitle, isLate) {
  await sendOrEnqueue({
    to: studentEmail,
    recipientName: studentName,
    subject: `Submission Received: ${escapeHtml(assignmentTitle)}`,
    html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #22c55e;">Submission Received</h2>
      <p>Hi <strong>${escapeHtml(studentName)}</strong>,</p>
      <p>Your submission for <strong>${escapeHtml(assignmentTitle)}</strong> has been received.</p>
      <div style="background: ${isLate ? '#fef9c3' : '#f0fdf4'}; padding: 12px 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid ${isLate ? '#eab308' : '#22c55e'};">
        <strong>${isLate ? '&#9888; Marked as LATE submission' : '&#10003; Submitted on time'}</strong>
      </div>
      <p><a href="${baseUrl}/my-submissions" style="background: #22c55e; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none;">View Submission</a></p>
      <p style="color: #94a3b8; font-size: 12px;">You are receiving this because you are registered on ASMS.</p>
    </div>`,
  });
}

async function sendGradeReleased(studentEmail, studentName, assignmentTitle, score, feedback) {
  await sendOrEnqueue({
    to: studentEmail,
    recipientName: studentName,
    subject: `Grade Released: ${escapeHtml(assignmentTitle)}`,
    html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6366f1;">Grade Released</h2>
      <p>Hi <strong>${escapeHtml(studentName)}</strong>,</p>
      <p>Your submission for <strong>${escapeHtml(assignmentTitle)}</strong> has been graded.</p>
      <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center;">
        <div style="font-size: 36px; font-weight: 700; color: ${score >= 50 ? '#22c55e' : '#ef4444'};">${escapeHtml(score)}</div>
        <div style="color: #64748b; font-size: 14px;">out of 100</div>
      </div>
      ${feedback ? `<p><strong>Feedback:</strong> ${escapeHtml(feedback)}</p>` : ''}
      <p><a href="${baseUrl}/my-submissions" style="background: #6366f1; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none;">View Result</a></p>
      <p style="color: #94a3b8; font-size: 12px;">You are receiving this because you are registered on ASMS.</p>
    </div>`,
  });
}

async function sendDeadlineReminder(studentEmail, studentName, assignmentTitle, dueDate) {
  await sendOrEnqueue({
    to: studentEmail,
    recipientName: studentName,
    subject: `Reminder: ${escapeHtml(assignmentTitle)} due soon`,
    html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #eab308;">Deadline Reminder</h2>
      <p>Hi <strong>${escapeHtml(studentName)}</strong>,</p>
      <p>This is a reminder that <strong>${escapeHtml(assignmentTitle)}</strong> is due in less than 24 hours.</p>
      <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0; font-size: 14px;">Due: <strong>${formatDueDate(dueDate)}</strong></p>
      </div>
      <p><a href="${baseUrl}/assignments" style="background: #eab308; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none;">Submit Now</a></p>
      <p style="color: #94a3b8; font-size: 12px;">You are receiving this because you are registered on ASMS.</p>
    </div>`,
  });
}

async function sendAnnouncement(studentEmail, studentName, announcementTitle, message, publishDate) {
  await sendOrEnqueue({
    to: studentEmail,
    recipientName: studentName,
    subject: `Announcement: ${escapeHtml(announcementTitle)}`,
    html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6366f1;">Announcement</h2>
      <p>Hi <strong>${escapeHtml(studentName)}</strong>,</p>
      <p><strong>${escapeHtml(announcementTitle)}</strong></p>
      <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(message)}</p>
      </div>
      <p><a href="${baseUrl}/announcements" style="background: #6366f1; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none;">View Announcement</a></p>
      <p style="color: #94a3b8; font-size: 12px;">You are receiving this because you are registered on ASMS.</p>
    </div>`,
  });
}

async function sendAppealFiled(lecturerEmail, lecturerName, studentName, assignmentTitle, reason) {
  await sendOrEnqueue({
    to: lecturerEmail,
    recipientName: lecturerName,
    subject: `Grade appeal: ${escapeHtml(assignmentTitle)}`,
    html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #6366f1;">Grade Appeal</h2>
      <p>Hi <strong>${escapeHtml(lecturerName)}</strong>,</p>
      <p><strong>${escapeHtml(studentName)}</strong> has appealed their grade for <strong>${escapeHtml(assignmentTitle)}</strong>.</p>
      <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #6366f1;">
        <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(reason)}</p>
      </div>
      <p><a href="${baseUrl}/appeals" style="background: #6366f1; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none;">Review Appeal</a></p>
      <p style="color: #94a3b8; font-size: 12px;">You are receiving this because you are registered on ASMS.</p>
    </div>`,
  });
}

async function sendAppealResolved(studentEmail, studentName, assignmentTitle, outcome, note) {
  await sendOrEnqueue({
    to: studentEmail,
    recipientName: studentName,
    subject: `Appeal ${outcome}: ${escapeHtml(assignmentTitle)}`,
    html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: ${outcome === 'accepted' ? '#22c55e' : '#ef4444'};">Appeal ${outcome === 'accepted' ? 'Accepted' : 'Rejected'}</h2>
      <p>Hi <strong>${escapeHtml(studentName)}</strong>,</p>
      <p>Your appeal for <strong>${escapeHtml(assignmentTitle)}</strong> has been ${outcome === 'accepted' ? 'accepted and re-graded' : 'reviewed'}. Please log in to view the outcome.</p>
      ${note ? `<div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid ${outcome === 'accepted' ? '#22c55e' : '#ef4444'};">
        <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(note)}</p>
      </div>` : ''}
      <p><a href="${baseUrl}/my-submissions" style="background: #6366f1; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none;">View Result</a></p>
      <p style="color: #94a3b8; font-size: 12px;">You are receiving this because you are registered on ASMS.</p>
    </div>`,
  });
}

module.exports = {
  sendAssignmentCreated,
  sendSubmissionConfirmation,
  sendGradeReleased,
  sendDeadlineReminder,
  sendAnnouncement,
  sendAppealFiled,
  sendAppealResolved,
};
