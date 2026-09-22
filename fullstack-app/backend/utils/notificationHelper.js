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

async function notifyGradeReleased(userIds, assignmentTitle, submissionId) {
  for (const userId of [...new Set(userIds)]) {
    try {
      await notificationModel.create({
        userId,
        type: 'grade_released',
        title: 'Grade Released',
        message: `Your grade for "${assignmentTitle}" has been released. Check your results.`,
        link: `/submissions/${submissionId}`,
      });
    } catch (err) {
      console.error('Failed to create notification:', err.message);
    }
  }
}

async function notifyAppealFiled(lecturerId, assignmentTitle, appealId) {
  try {
    await notificationModel.create({
      userId: lecturerId,
      type: 'appeal_filed',
      title: 'Grade Appeal',
      message: `A student has appealed their grade for "${assignmentTitle}". Review the appeal.`,
      link: `/appeals?s=open`,
    });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
}

async function notifyAppealResolved(studentId, assignmentTitle, outcome, submissionId) {
  try {
    await notificationModel.create({
      userId: studentId,
      type: 'appeal_resolved',
      title: 'Appeal Decided',
      message: `Your appeal for "${assignmentTitle}" was ${outcome}. Check your results.`,
      link: `/submissions/${submissionId}`,
    });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
}

module.exports = { notifyAssignmentCreated, notifySubmissionConfirmed, notifyGradeReleased, notifyAppealFiled, notifyAppealResolved };
