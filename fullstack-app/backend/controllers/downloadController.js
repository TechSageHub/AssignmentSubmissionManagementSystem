const archiver = require('archiver');
const assignmentModel = require('../models/assignment');
const submissionModel = require('../models/submission');
const storage = require('../services/storage');

async function downloadAllSubmissions(req, res, next) {
  try {
    const assignmentId = parseInt(req.params.id, 10);
    if (isNaN(assignmentId)) {
      return res.status(400).json({ error: 'ValidationError', details: 'Invalid assignment ID' });
    }

    const assignment = await assignmentModel.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'NotFound', details: 'Assignment not found' });
    }
    if (assignment.lecturer_id !== req.user.id) {
      return res.status(403).json({ error: 'AuthorizationError', details: 'Not your assignment' });
    }

    const submissions = await submissionModel.findByAssignment(assignmentId);
    if (submissions.length === 0) {
      return res.status(404).json({ error: 'NotFound', details: 'No submissions to download' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${assignment.title.replace(/[^a-zA-Z0-9]/g, '_')}_submissions.zip"`);

    const archive = archiver('zip', { zlib: { level: 5 } });
    archive.pipe(res);

    for (const sub of submissions) {
      try {
        const fileStream = await storage.createReadStream(sub.file_path);
        if (fileStream) {
          const safeName = `${sub.student_name || 'student_' + sub.student_id}_${sub.original_name || 'file'}`;
          archive.append(fileStream, { name: safeName });
        }
      } catch { /* skip missing files */ }
    }

    archive.finalize();
  } catch (err) {
    next(err);
  }
}

module.exports = { downloadAllSubmissions };
