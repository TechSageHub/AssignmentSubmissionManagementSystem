const notificationModel = require('../models/notification');

async function notifyAssignmentCreated(studentIds, assignmentTitle, assignmentId) {
  for (const userId of studentIds) {
    try {
      await notificationModel.create({
        userId,
        type: 'assignment_created',
        title: 'New Assignment Published',
        message: `"${assignmentTitle}" has been published. Check the deadline and submit your work.`,
        link: `/assignments/${assignmentId}`,
      });
    } catch (err) {
      console.error('Failed to create notification:', err.message);
    }
  }
}

async function notifySubmissionConfirmed(userId, assignmentTitle, submissionId) {
  try {
    await notificationModel.create({
      userId,
      type: 'submission_confirmed',
      title: 'Submission Received',
      message: `Your submission for "${assignmentTitle}" has been received successfully.`,
      link: `/submissions/${submissionId}`,
    });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
}

async function notifyGradeReleased(studentId, assignmentTitle, submissionId) {
  try {
    await notificationModel.create({
      userId: studentId,
      type: 'grade_released',
      title: 'Grade Released',
      message: `Your grade for "${assignmentTitle}" has been released. Check your results.`,
      link: `/submissions/${submissionId}`,
    });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
}

module.exports = { notifyAssignmentCreated, notifySubmissionConfirmed, notifyGradeReleased };
