const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { getStudents, updateProfile } = require('../controllers/userController');

const router = Router();

router.use(authenticate);
router.get('/students', getStudents);
router.put('/profile', updateProfile);

module.exports = router;
