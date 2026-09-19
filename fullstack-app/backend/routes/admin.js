const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { getUsers, getUser, updateUserRole, toggleUserStatus, importUsers, getSystemStats, getAuditLogs } = require('../controllers/adminController');
const { getCourses, createCourse, updateCourse, deleteCourse } = require('../controllers/courseController');


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

module.exports = router;
