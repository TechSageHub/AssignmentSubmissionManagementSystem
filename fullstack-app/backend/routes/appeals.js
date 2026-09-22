const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { fileAppeal, getMyAppeals, getLecturerAppeals, rejectAppeal } = require('../controllers/appealController');

const router = Router();

router.use(authenticate);

router.post('/', requireRole('student'), fileAppeal);
router.get('/mine', requireRole('student'), getMyAppeals);
router.get('/', requireRole('lecturer'), getLecturerAppeals);
router.post('/:id/resolve', requireRole('lecturer'), rejectAppeal);

module.exports = router;