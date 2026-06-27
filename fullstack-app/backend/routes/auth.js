const { Router } = require('express');
const { login, verifyEmail, resendVerification, forgotPassword, resetPassword, getMe, changePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.post('/login', login);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, changePassword);

module.exports = router;
