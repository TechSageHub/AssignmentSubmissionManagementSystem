const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const {
  createAssignment,
  getAssignments,
  getAssignment,
  updateAssignment,
  deleteAssignment,
} = require('../controllers/assignmentController');
const {
  submitAssignment,
  getSubmissionsByAssignment,
} = require('../controllers/submissionController');
const { getAssignmentAnalytics } = require('../controllers/analyticsController');
const { getRubric, saveRubric } = require('../controllers/rubricController');
const { downloadAllSubmissions } = require('../controllers/downloadController');

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.resolve(__dirname, '..', 'uploads', 'assignments', req.params.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `student_${req.user.id}_${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(authenticate);

router.get('/', getAssignments);
router.get('/:id', getAssignment);
router.post('/', requireRole('lecturer'), createAssignment);
router.put('/:id', requireRole('lecturer'), updateAssignment);
router.delete('/:id', requireRole('lecturer'), deleteAssignment);

router.post('/:id/submit', requireRole('student'), upload.array('files', 5), submitAssignment);
router.get('/:id/submissions', requireRole('lecturer'), getSubmissionsByAssignment);
router.get('/:id/analytics', requireRole('lecturer'), getAssignmentAnalytics);
router.get('/:id/download-all', requireRole('lecturer'), downloadAllSubmissions);
router.get('/:id/rubric', getRubric);
router.put('/:id/rubric', requireRole('lecturer'), saveRubric);

module.exports = router;
