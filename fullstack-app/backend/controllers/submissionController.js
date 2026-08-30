const path = require('path');
const fs = require('fs');
const assignmentModel = require('../models/assignment');
const submissionModel = require('../models/submission');
const submissionFileModel = require('../models/submissionFile');
const groupMemberModel = require('../models/groupMember');
const userModel = require('../models/user');
const { sendSubmissionConfirmation } = require('../utils/emailHelper');
const { notifySubmissionConfirmed } = require('../utils/notificationHelper');
const { assertSubmissionAssignmentOwner } = require('../utils/authorization');
const { parseInputDate, toIsoUtc } = require('../utils/dates');
const { withTransaction, isDuplicateKeyError } = require('../config/db');

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

    const isLate = new Date() > parseInputDate(assignment.due_date);

    // Validate proposed group members: real, active students who have not already
    // submitted this assignment. Invalid ids are silently dropped.
    let groupMemberIds = [];
    const rawIds = req.body.group_member_ids;
    if (Array.isArray(rawIds) && rawIds.length > 0) {
      const candidateIds = [...new Set(rawIds.map(Number).filter(id => !isNaN(id) && id !== req.user.id))];
      if (candidateIds.length > 0) {
        const validStudents = await userModel.findStudentsByIds(candidateIds);
        const submitted = await submissionModel.findByAssignment(assignmentId);
        const alreadySubmittedIds = new Set(submitted.map(s => s.student_id));
        groupMemberIds = validStudents.map(s => s.id).filter(id => !alreadySubmittedIds.has(id));
      }
    }

    let result;
    try {
      result = await withTransaction(async ({ exec }) => {
        const existing = await exec(
          'SELECT * FROM Submissions WHERE assignment_id = @assignmentId AND student_id = @studentId',
          { assignmentId, studentId: req.user.id }
        );

        let orphanedFiles = [];
        if (existing.recordset[0]) {
          const oldRows = await exec(
            'SELECT file_path FROM SubmissionFiles WHERE submission_id = @oldId',
            { oldId: existing.recordset[0].id }
          );
          orphanedFiles = oldRows.recordset.map(r => r.file_path);
          orphanedFiles.push(existing.recordset[0].file_path);
          await exec('DELETE FROM Submissions WHERE id = @oldId', { oldId: existing.recordset[0].id });
        }

        const created = await exec(
          `INSERT INTO Submissions (assignment_id, student_id, file_path, original_name, is_late)
           OUTPUT INSERTED.*
           VALUES (@assignmentId, @studentId, @filePath, @originalName, @isLate)`,
          {
            assignmentId,
            studentId: req.user.id,
            filePath: path.join('uploads', 'assignments', String(assignmentId), req.files[0].filename),
            originalName: req.files[0].originalname,
            isLate,
          }
        );
        const submission = created.recordset[0];

        for (const file of req.files) {
          await exec(
            `INSERT INTO SubmissionFiles (submission_id, file_path, original_name, file_size, mime_type)
             OUTPUT INSERTED.*
             VALUES (@submissionId, @filePath, @originalName, @fileSize, @mimeType)`,
            {
              submissionId: submission.id,
              filePath: path.join('uploads', 'assignments', String(assignmentId), file.filename),
              originalName: file.originalname,
              fileSize: file.size ?? 0,
              mimeType: file.mimetype || null,
            }
          );
        }

        for (const userId of groupMemberIds) {
          await exec(
            'INSERT INTO GroupMembers (submission_id, user_id) VALUES (@submissionId, @userId)',
            { submissionId: submission.id, userId }
          );
        }

        return { submission, orphanedFiles };
      });
    } catch (err) {
      // Concurrent duplicate: another request already created this student's submission.
      if (isDuplicateKeyError(err)) {
        return res.status(409).json({ error: 'ValidationError', details: 'You have already submitted this assignment' });
      }
      throw err;
    }

    // Commit succeeded — remove the replaced submission's disk files (best effort).
    for (const fp of result.orphanedFiles || []) {
      const abs = path.resolve(__dirname, '..', fp);
      try { fs.unlinkSync(abs); } catch { /* ignore */ }
    }

    const members = await groupMemberModel.findBySubmission(result.submission.id);
    const files = await submissionFileModel.findBySubmission(result.submission.id);
    result.submission.group_members = members;
    result.submission.files = files;

    try {
      await notifySubmissionConfirmed(req.user.id, assignment.title, result.submission.id);
      await sendSubmissionConfirmation(req.user.email, req.user.name, assignment.title, isLate);
    } catch (emailErr) {
      console.error('Failed to send submission confirmation email:', emailErr.message);
    }

    res.status(201).json({ message: 'Files submitted successfully', submission: result.submission });
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
      if (sub.due_date != null) {
        sub.due_date = toIsoUtc(sub.due_date);
      }
    }
    res.json(submissions);
  } catch (err) {
    next(err);
  }
}

async function getSubmission(req, res, next) {
  try {
    const submissionId = parseInt(req.params.submissionId, 10);
    if (isNaN(submissionId)) {
      return res.status(400).json({ error: 'ValidationError', details: 'Invalid submission ID' });
    }

    const submission = await submissionModel.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ error: 'NotFoundError', details: 'Submission not found' });
    }

    if (req.user.role === 'student') {
      // Check if student is the owner or a group member
      if (submission.student_id !== req.user.id) {
        const members = await groupMemberModel.findBySubmission(submission.id);
        const isMember = members.some(m => m.user_id === req.user.id);
        if (!isMember) {
          return res.status(403).json({ error: 'AuthorizationError', details: 'Not your submission' });
        }
      }
    } else if (req.user.role === 'lecturer') {
      const ownership = await assertSubmissionAssignmentOwner(req.user.id, submission);
      if (!ownership.ok) {
        return res.status(ownership.status).json({ error: 'AuthorizationError', details: ownership.message });
      }
    }

    const members = await groupMemberModel.findBySubmission(submission.id);
    const files = await submissionFileModel.findBySubmission(submission.id);
    submission.group_members = members;
    submission.files = files;

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

    const fileId = parseInt(req.query.fileId, 10);
    let fileRecord = null;
    if (!isNaN(fileId)) {
      fileRecord = await submissionFileModel.findById(fileId);
      if (!fileRecord || fileRecord.submission_id !== submission.id) {
        return res.status(404).json({ error: 'NotFoundError', details: 'File not found' });
      }
    }

    const selectedFile = fileRecord || { file_path: submission.file_path, original_name: submission.original_name };
    const filePath = path.resolve(__dirname, '..', selectedFile.file_path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'NotFoundError', details: 'File not found on server' });
    }

    const ext = path.extname(selectedFile.original_name).toLowerCase();
    const mimeMap = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.gif': 'image/gif', '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain', '.csv': 'text/csv',
    };
    const contentType = mimeMap[ext] || 'application/octet-stream';

    const safeName = String(selectedFile.original_name).replace(/["\\\r\n]/g, '_');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    res.setHeader('Content-Length', fs.statSync(filePath).size);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    next(err);
  }
}

module.exports = { submitAssignment, getSubmissionsByAssignment, getAllSubmissions, getMySubmissions, getSubmission, getSubmissionFile };
