const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { getUsers, getUser, updateUserRole, toggleUserStatus, importUsers, getSystemStats, getAuditLogs } = require('../controllers/adminController');
const { getCourses, createCourse, updateCourse, deleteCourse } = require('../controllers/courseController');
const emailOutbox = require('../models/emailOutbox');


const router = Router();

router.use(authenticate);
router.use(requireRole('admin'));

router.get('/users', getUsers);
router.post('/users/import', importUsers);
router.get('/users/:id', getUser);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/toggle-status', toggleUserStatus);
router.get('/courses', getCourses);
router.post('/courses', createCourse);
router.put('/courses/:id', updateCourse);
router.delete('/courses/:id', deleteCourse);
router.get('/stats', getSystemStats);
router.get('/audit-logs', getAuditLogs);
router.get('/email-queue/stats', async (_req, res, next) => {
  try {
    const stats = await emailOutbox.countByStatus();
    res.json({ ...stats, enabled: process.env.EMAIL_QUEUE_ENABLED === 'true' });
  } catch (err) { next(err); }
});

router.get('/email-queue', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const rows = await emailOutbox.listRecent(limit);
    res.json({ items: rows, total: rows.length });
  } catch (err) { next(err); }
});

// Retry a row: reset it to due 'pending' so the worker picks it back up.
router.post('/email-queue/:id/retry', async (req, res, next) => {
  try {
    await emailOutbox.requeueStale();
    const row = await emailOutbox.claimNext();
    res.json({ ok: true, requeued: !!row });
  } catch (err) { next(err); }
});

module.exports = router;
