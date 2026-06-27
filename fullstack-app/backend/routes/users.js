const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { getStudents, updateProfile, createUser } = require('../controllers/userController');

const router = Router();

router.use(authenticate);
router.get('/students', getStudents);
router.put('/profile', updateProfile);
router.post('/', requireRole('admin', 'lecturer'), createUser);

module.exports = router;
