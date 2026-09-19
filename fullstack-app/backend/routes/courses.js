const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { getCourseLookup } = require('../controllers/courseController');

const router = Router();

// Any authenticated user can fetch the course catalog for assignment forms.
router.use(authenticate);
router.get('/', getCourseLookup);

module.exports = router;