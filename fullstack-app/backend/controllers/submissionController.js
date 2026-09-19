const path = require('path');
const assignmentModel = require('../models/assignment');
const submissionModel = require('../models/submission');
const submissionFileModel = require('../models/submissionFile');
const groupMemberModel = require('../models/groupMember');
const submissionHistoryModel = require('../models/submissionHistory');
const userModel = require('../models/user');
const { sendSubmissionConfirmation } = require('../utils/emailHelper');
const { notifySubmissionConfirmed } = require('../utils/notificationHelper');
const { assertSubmissionReadAccess } = require('../utils/authorization');
const { parseInputDate, toIsoUtc } = require('../utils/dates');
const storage = require('../services/storage');
const { withTransaction, isDuplicateKeyError } = require('../config/db');

function buildFilePaths(assignmentId, files) {
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return files.map((file, i) => {
    const ext = path.extname(file.originalname);
    const filename = `student_${uniqueSuffix}_${i}${ext}`;
    return path.posix.join('uploads', 'assignments', String(assignmentId), filename);
  });
}

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

    if (isLate && !assignment.accept_late_submissions) {
      return res.status(400).json({ error: 'ValidationError', details: 'Late submissions are not accepted for this assignment' });
    }
    if (isLate && assignment.late_cutoff != null && new Date() > parseInputDate(assignment.late_cutoff)) {
      return res.status(400).json({ error: 'ValidationError', details: 'The late submission window for this assignment has closed' });
    }

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

    const filePaths = buildFilePaths(assignmentId, req.files);

    // Persist file bytes to storage BEFORE the DB transaction so a failed
    // insert never leaves dangling DB rows. Clean up on any later failure.
    try {
      for (let i = 0; i < req.files.length; i++) {
        await storage.storeFile({
          filePath: filePaths[i],
          buffer: req.files[i].buffer,
          contentType: req.files[i].mimetype || null,
        });
      }
    } catch (err) {
      for (const fp of filePaths) await storage.unlink(fp);
      throw err;
    }

    let result;
    try {
      result = await withTransaction(async ({ exec }) => {
        const existing = await exec(
          'SELECT * FROM Submissions WHERE assignment_id = @assignmentId AND student_id = @studentId',
          { assignmentId, studentId: req.user.id }
        );

        let submission;
        if (existing.recordset[0]) {
          const oldSubmission = existing.recordset[0];
          const oldFiles = await exec(
            'SELECT * FROM SubmissionFiles WHERE submission_id = @oldId',
            { oldId: oldSubmission.id }
          );
          // Archive the previous current version (its files stay in storage).
          await exec(
            `INSERT INTO SubmissionHistory (submission_id, version_number, file_path, original_name, is_late, submitted_at, files_json)
             OUTPUT INSERTED.*
             SELECT @submissionId, COALESCE(MAX(version_number), -1) + 1, @filePath, @originalName, @isLate, @submittedAt, @filesJson
             FROM SubmissionHistory
             WHERE submission_id = @submissionId`,
            {
              submissionId: oldSubmission.id,
              filePath: oldSubmission.file_path,
              originalName: oldSubmission.original_name,
              isLate: oldSubmission.is_late,
              submittedAt: oldSubmission.submitted_at,
              filesJson: JSON.stringify(
                (oldFiles.recordset || []).map(f => ({
                  file_path: f.file_path,
                  original_name: f.original_name,
                  file_size: f.file_size ?? 0,
                  mime_type: f.mime_type || null,
                }))
              ),
            }
          );
          await exec('DELETE FROM SubmissionFiles WHERE submission_id = @submissionId', { submissionId: oldSubmission.id });

          const updated = await exec(
            `UPDATE Submissions SET file_path = @filePath, original_name = @originalName, is_late = @isLate, submitted_at = GETDATE()
             OUTPUT INSERTED.*
             WHERE id = @id`,
            {
              id: oldSubmission.id,
              filePath: filePaths[0],
              originalName: req.files[0].originalname,
              isLate,
            }
          );
          submission = updated.recordset[0];
        } else {
          const created = await exec(
            `INSERT INTO Submissions (assignment_id, student_id, file_path, original_name, is_late)
             OUTPUT INSERTED.*
             VALUES (@assignmentId, @studentId, @filePath, @originalName, @isLate)`,
            {
              assignmentId,
              studentId: req.user.id,
              filePath: filePaths[0],
              originalName: req.files[0].originalname,
              isLate,
            }
          );
          submission = created.recordset[0];
        }

        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];
          await exec(
            `INSERT INTO SubmissionFiles (submission_id, file_path, original_name, file_size, mime_type)
             OUTPUT INSERTED.*
             VALUES (@submissionId, @filePath, @originalName, @fileSize, @mimeType)`,
            {
              submissionId: submission.id,
              filePath: filePaths[i],
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

        return { submission };
      });
    } catch (err) {
      // Clean up the just-stored files (best effort) when the transaction rolls back.
      for (const fp of filePaths) await storage.unlink(fp);
      // Concurrent duplicate: another request already created this student's submission.
      if (isDuplicateKeyError(err)) {
        return res.status(409).json({ error: 'ValidationError', details: 'You have already submitted this assignment' });
      }
      throw err;
    }

    const members = await groupMemberModel.findBySubmission(result.submission.id);
    const files = await submissionFileModel.findBySubmission(result.submission.id);
    const history = await submissionHistoryModel.findBySubmission(result.submission.id);
    result.submission.group_members = members;
    result.submission.files = files;
    result.submission.history = history;

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
      sub.history = await submissionHistoryModel.findBySubmission(sub.id);
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
      sub.files = await submissionFileModel.findBySubmission(sub.id);
      sub.history = await submissionHistoryModel.findBySubmission(sub.id);
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

    const members = await groupMemberModel.findBySubmission(submission.id);
    const isGroupMember = submission.student_id !== req.user.id
      ? members.some(m => m.user_id === req.user.id)
      : false;
    const access = await assertSubmissionReadAccess(req.user, submission, isGroupMember);
    if (!access.ok) {
      return res.status(access.status).json({ error: 'AuthorizationError', details: access.message });
    }

    const files = await submissionFileModel.findBySubmission(submission.id);
    submission.group_members = members;
    submission.files = files;
    submission.history = await submissionHistoryModel.findBySubmission(submission.id);

    res.json(submission);
  } catch (err) {
    next(err);
  }
}

async function getSubmissionFile(req, res, next) {
  try {
    const submissionId = parseInt(req.params.submissionId, 10);
    if (isNaN(submissionId)) {
      return res.status(400).json({ error: 'ValidationError', details: 'Invalid submission ID' });
    }

    const submission = await submissionModel.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ error: 'NotFoundError', details: 'Submission not found' });
    }

    const isGroupMember = submission.student_id !== req.user.id
      ? (await groupMemberModel.findBySubmission(submission.id)).some(m => m.user_id === req.user.id)
      : false;
    const access = await assertSubmissionReadAccess(req.user, submission, isGroupMember);
    if (!access.ok) {
      return res.status(access.status).json({ error: 'AuthorizationError', details: access.message });
    }

    const fileId = parseInt(req.query.fileId, 10);
    const requestedPath = req.query.filePath;
    let fileRecord = null;

    if (requestedPath) {
      // Allow downloading any file that belongs to this submission's lineage,
      // including archived prior versions.
      const pathToName = new Map([[submission.file_path, submission.original_name]]);
      for (const f of await submissionFileModel.findBySubmission(submission.id)) {
        pathToName.set(f.file_path, f.original_name);
      }
      for (const h of await submissionHistoryModel.findBySubmission(submission.id)) {
        pathToName.set(h.file_path, h.original_name);
        let entries = [];
        try {
          entries = JSON.parse(h.files_json || '[]');
        } catch { /* ignore malformed json */ }
        for (const f of entries) {
          if (f && f.file_path) pathToName.set(f.file_path, f.original_name || pathToName.get(f.file_path) || 'file');
        }
      }
      if (!pathToName.has(requestedPath)) {
        return res.status(404).json({ error: 'NotFoundError', details: 'File not found' });
      }
      fileRecord = { file_path: requestedPath, original_name: pathToName.get(requestedPath) };
    } else if (!isNaN(fileId)) {
      fileRecord = await submissionFileModel.findById(fileId);
      if (!fileRecord || fileRecord.submission_id !== submission.id) {
        return res.status(404).json({ error: 'NotFoundError', details: 'File not found' });
      }
    }

    const selectedFile = fileRecord || { file_path: submission.file_path, original_name: submission.original_name };
    const size = await storage.exists(selectedFile.file_path, true);
    if (size === null) {
      return res.status(404).json({ error: 'NotFoundError', details: 'File not found on server' });
    }

    const ext = path.extname(selectedFile.original_name).toLowerCase();
    const mimeMap = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain', '.csv': 'text/csv', '.json': 'application/json',
      '.html': 'text/html', '.htm': 'text/html', '.css': 'text/css',
      '.js': 'text/plain', '.ts': 'text/plain', '.tsx': 'text/plain', '.jsx': 'text/plain',
      '.py': 'text/plain', '.java': 'text/plain', '.c': 'text/plain', '.cpp': 'text/plain',
      '.h': 'text/plain', '.cs': 'text/plain', '.sql': 'text/plain', '.md': 'text/markdown',
      '.xml': 'text/xml', '.log': 'text/plain', '.env': 'text/plain',
    };
    const contentType = mimeMap[ext] || 'application/octet-stream';

    const fileStream = await storage.createReadStream(selectedFile.file_path);
    if (!fileStream) {
      return res.status(404).json({ error: 'NotFoundError', details: 'File not found on server' });
    }

    const safeName = String(selectedFile.original_name).replace(/["\\\r\n]/g, '_');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    if (size !== true) {
      res.setHeader('Content-Length', size);
    }
    fileStream.on('error', () => res.destroy());
    fileStream.pipe(res);
  } catch (err) {
    next(err);
  }
}

module.exports = { submitAssignment, getSubmissionsByAssignment, getAllSubmissions, getMySubmissions, getSubmission, getSubmissionFile };
