const express = require('express');
const router = express.Router();
const {
  requestPasswordReset,
  resetPassword,
  resendOTP
} = require('../controllers/passwordResetController');

// @route   POST /api/password-reset/request
// @desc    Request password reset OTP
// @access  Public
router.post('/request', requestPasswordReset);

// @route   POST /api/password-reset/verify
// @desc    Verify OTP and reset password
// @access  Public
router.post('/verify', resetPassword);

// @route   POST /api/password-reset/resend
// @desc    Resend OTP
// @access  Public
router.post('/resend', resendOTP);

module.exports = router;
