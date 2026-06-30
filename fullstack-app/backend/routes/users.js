const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { getStudents, updateProfile, createUser } = require('../controllers/userController');
const { importUsers } = require('../controllers/adminController');

const router = Router();

router.use(authenticate);
router.get('/students', getStudents);
router.put('/profile', updateProfile);
router.post('/', requireRole('admin', 'lecturer'), createUser);
router.post('/import', requireRole('admin', 'lecturer'), importUsers);

module.exports = router;
