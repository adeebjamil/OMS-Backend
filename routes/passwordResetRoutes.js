const express = require('express');
const router = express.Router();
const {
  checkEmail,
  sendOTP,
  verifyOTP,
  resetPassword,
  resendOTP
} = require('../controllers/passwordResetController');

// Check email and get user info
router.post('/check-email', checkEmail);

// Send OTP to email
router.post('/send-otp', sendOTP);

// Verify OTP
router.post('/verify-otp', verifyOTP);

// Reset password after verification
router.post('/reset-password', resetPassword);

// Resend OTP
router.post('/resend-otp', resendOTP);

module.exports = router;
