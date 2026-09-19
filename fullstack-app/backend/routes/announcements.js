const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} = require('../controllers/announcementController');

const router = Router();
router.use(authenticate);

router.get('/', getAnnouncements);
router.post('/', requireRole('lecturer', 'admin'), createAnnouncement);
router.put('/:id', requireRole('lecturer', 'admin'), updateAnnouncement);
router.delete('/:id', requireRole('lecturer', 'admin'), deleteAnnouncement);

module.exports = router;
