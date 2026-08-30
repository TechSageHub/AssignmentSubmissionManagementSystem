const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { uploadLimiter } = require('../middleware/rateLimit');
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

// Files are held in memory and pushed to storage (S3 in prod, disk in dev) by
// the controller, never written to the server's filesystem by multer.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_UPLOAD_EXTENSIONS.has(ext)) {
      const err = new Error(`File type "${ext || file.originalname}" is not allowed`);
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

const ALLOWED_UPLOAD_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
  '.pdf',
  '.txt', '.csv', '.md', '.log', '.rtf',
  '.doc', '.docx', '.odt',
  '.xls', '.xlsx', '.ods',
  '.ppt', '.pptx', '.odp',
  '.zip', '.rar', '.7z', '.tar', '.gz',
  '.json', '.xml',
]);

router.use(authenticate);

router.get('/', getAssignments);
router.get('/:id', getAssignment);
router.post('/', requireRole('lecturer'), createAssignment);
router.put('/:id', requireRole('lecturer'), updateAssignment);
router.delete('/:id', requireRole('lecturer'), deleteAssignment);

router.post('/:id/submit', requireRole('student'), uploadLimiter, upload.array('files', 5), submitAssignment);
router.get('/:id/submissions', requireRole('lecturer'), getSubmissionsByAssignment);
router.get('/:id/analytics', requireRole('lecturer'), getAssignmentAnalytics);
router.get('/:id/download-all', requireRole('lecturer'), downloadAllSubmissions);
router.get('/:id/rubric', getRubric);
router.put('/:id/rubric', requireRole('lecturer'), saveRubric);

module.exports = router;
