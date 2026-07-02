const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { getAllSubmissions, getMySubmissions, getSubmission, getSubmissionFile } = require('../controllers/submissionController');
const { gradeSubmission, bulkGradeSubmissions, getGrade } = require('../controllers/gradeController');

const router = Router();

router.use(authenticate);

router.get('/', requireRole('lecturer'), getAllSubmissions);
router.get('/mine', requireRole('student'), getMySubmissions);
router.get('/:submissionId', getSubmission);
router.get('/:submissionId/file', getSubmissionFile);
router.put('/:submissionId/grade', requireRole('lecturer'), gradeSubmission);
router.post('/bulk-grade', requireRole('lecturer'), bulkGradeSubmissions);
router.get('/:submissionId/grade', getGrade);

module.exports = router;
