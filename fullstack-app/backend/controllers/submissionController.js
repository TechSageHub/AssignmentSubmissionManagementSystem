const path = require('path');
const fs = require('fs');
const assignmentModel = require('../models/assignment');
const submissionModel = require('../models/submission');
const groupMemberModel = require('../models/groupMember');
const { sendSubmissionConfirmation } = require('../utils/emailHelper');
const { notifySubmissionConfirmed } = require('../utils/notificationHelper');

async function submitAssignment(req, res, next) {
  try {
    const assignmentId = parseInt(req.params.id, 10);
    if (isNaN(assignmentId)) {
      return res.status(400).json({ error: 'ValidationError', details: 'Invalid assignment ID' });
    }

    const assignment = await assignmentModel.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'NotFoundError', details: 'Assignment not found' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'ValidationError', details: 'At least one file is required' });
    }

    for (const file of req.files) {
      if (file.size === 0) {
        return res.status(400).json({ error: 'ValidationError', details: 'Empty files are not allowed' });
      }
    }

    const isLate = new Date() > new Date(assignment.due_date);

    const file = req.files[0];
    const filePath = path.join('uploads', 'assignments', String(assignmentId), file.filename);
    const originalName = file.originalname;

    const existing = await submissionModel.findByAssignmentAndStudent(assignmentId, req.user.id);
    if (existing) {
      const oldPath = path.resolve(__dirname, '..', existing.file_path);
      try { fs.unlinkSync(oldPath); } catch { /* file may not exist */ }
      await submissionModel.remove(existing.id);
    }

    const submission = await submissionModel.create({
      assignmentId,
      studentId: req.user.id,
      filePath,
      originalName,
      isLate,
    });

    // Add group members if provided
    const groupMemberIds = req.body.group_member_ids;
    if (Array.isArray(groupMemberIds) && groupMemberIds.length > 0) {
      const validIds = groupMemberIds.map(Number).filter(id => !isNaN(id) && id !== req.user.id);
      if (validIds.length > 0) {
        await groupMemberModel.addMembers(submission.id, validIds);
      }
    }

    // Load group members for response
    const members = await groupMemberModel.findBySubmission(submission.id);
    submission.group_members = members;

    try {
      await notifySubmissionConfirmed(req.user.id, assignment.title, submission.id);
      await sendSubmissionConfirmation(req.user.email, req.user.name, assignment.title, isLate);
    } catch (emailErr) {
      console.error('Failed to send submission confirmation email:', emailErr.message);
    }

    res.status(201).json({ message: 'Files submitted successfully', submission });
  } catch (err) {
    next(err);
  }
}

async function getSubmissionsByAssignment(req, res, next) {
  try {
    const assignmentId = parseInt(req.params.id, 10);
    if (isNaN(assignmentId)) {
      return res.status(400).json({ error: 'ValidationError', details: 'Invalid assignment ID' });
    }

    const assignment = await assignmentModel.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'NotFoundError', details: 'Assignment not found' });
    }
    if (assignment.lecturer_id !== req.user.id) {
      return res.status(403).json({ error: 'AuthorizationError', details: 'Not your assignment' });
    }

    const submissions = await submissionModel.findByAssignment(assignmentId);
    const ids = submissions.map(s => s.id);
    const grouped = await groupMemberModel.findBySubmissions(ids);
    for (const sub of submissions) {
      sub.group_members = grouped[sub.id] || [];
    }
    res.json(submissions);
  } catch (err) {
    next(err);
  }
}

async function getAllSubmissions(req, res, next) {
  try {
    const submissions = await submissionModel.findAll(req.user.id);
    res.json(submissions);
  } catch (err) {
    next(err);
  }
}

async function getMySubmissions(req, res, next) {
  try {
    const submissions = await submissionModel.findByStudent(req.user.id);
    const ids = submissions.map(s => s.id);
    const grouped = await groupMemberModel.findBySubmissions(ids);
    for (const sub of submissions) {
      sub.group_members = grouped[sub.id] || [];
    }
    res.json(submissions);
  } catch (err) {
    next(err);
  }
}

async function getSubmission(req, res, next) {
  try {
    const submission = await submissionModel.findById(req.params.submissionId);
    if (!submission) {
      return res.status(404).json({ error: 'NotFoundError', details: 'Submission not found' });
    }

    if (req.user.role === 'student' && submission.student_id !== req.user.id) {
      // Check if student is a group member
      const members = await groupMemberModel.findBySubmission(submission.id);
      const isMember = members.some(m => m.user_id === req.user.id);
      if (!isMember) {
        return res.status(403).json({ error: 'AuthorizationError', details: 'Not your submission' });
      }
    }

    const members = await groupMemberModel.findBySubmission(submission.id);
    submission.group_members = members;

    res.json(submission);
  } catch (err) {
    next(err);
  }
}

async function getSubmissionFile(req, res, next) {
  try {
    const submission = await submissionModel.findById(req.params.submissionId);
    if (!submission) {
      return res.status(404).json({ error: 'NotFoundError', details: 'Submission not found' });
    }

    // Authorization
    if (req.user.role === 'student' && submission.student_id !== req.user.id) {
      const members = await groupMemberModel.findBySubmission(submission.id);
      const isMember = members.some(m => m.user_id === req.user.id);
      if (!isMember) {
        return res.status(403).json({ error: 'AuthorizationError', details: 'Not your submission' });
      }
    } else if (req.user.role === 'lecturer') {
      const assignment = await assignmentModel.findById(submission.assignment_id);
      if (!assignment || assignment.lecturer_id !== req.user.id) {
        return res.status(403).json({ error: 'AuthorizationError', details: 'Not your assignment' });
      }
    }

    const filePath = path.resolve(__dirname, '..', submission.file_path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'NotFoundError', details: 'File not found on server' });
    }

    const ext = path.extname(submission.original_name).toLowerCase();
    const mimeMap = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain', '.csv': 'text/csv',
      '.html': 'text/html', '.htm': 'text/html',
    };
    const contentType = mimeMap[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${submission.original_name}"`);
    res.setHeader('Content-Length', fs.statSync(filePath).size);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    next(err);
  }
}

module.exports = { submitAssignment, getSubmissionsByAssignment, getAllSubmissions, getMySubmissions, getSubmission, getSubmissionFile };
