const { Router } = require('express');
const { login, verifyEmail, resendVerification, forgotPassword, resetPassword, getMe, changePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter, emailLinkLimiter } = require('../middleware/rateLimit');

const router = Router();

router.post('/login', authLimiter, login);
router.get('/verify-email', emailLinkLimiter, verifyEmail);
router.post('/resend-verification', authLimiter, resendVerification);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, changePassword);

module.exports = router;
