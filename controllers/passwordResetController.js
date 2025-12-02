const crypto = require('crypto');
const User = require('../models/User');
const { sendWhatsAppOTP } = require('../config/whatsapp');

// Store OTPs temporarily (in production, use Redis)
const otpStore = new Map();

// @desc    Request password reset OTP
// @route   POST /api/password-reset/request
// @access  Public
exports.requestPasswordReset = async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide phone number'
      });
    }

    // Validate phone number format (country code + number, no +, no spaces)
    const phoneRegex = /^[1-9]\d{9,14}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format. Use: country code + number (e.g., 919876543210)'
      });
    }

    // Find user by phone - ONLY registered users can reset password
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this phone number. Please contact admin.'
      });
    }

    // Additional security: Check if phone number is not empty in database
    if (!user.phone || user.phone.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Your account does not have a registered phone number. Please contact admin.'
      });
    }

    // Only allow employees to use this feature (optional - remove if admins should also use it)
    if (user.role !== 'intern') {
      return res.status(403).json({
        success: false,
        message: 'This feature is only available for interns. Admins should use email reset.'
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP with expiry (10 minutes)
    const otpData = {
      otp,
      userId: user._id,
      email: user.email, // Store for verification
      role: user.role,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      attempts: 0
    };
    otpStore.set(phone, otpData);

    console.log(`📱 OTP Request - Phone: ${phone} | User: ${user.email} | Role: ${user.role}`);
    console.log(`📱 Generated OTP for ${phone}:`, otp);

    // Send OTP via WhatsApp
    const whatsappResult = await sendWhatsAppOTP(phone, otp);

    if (!whatsappResult.success) {
      // If WhatsApp fails, still return success but log error
      console.error('WhatsApp OTP send failed, but OTP generated:', otp);
      return res.status(200).json({
        success: true,
        message: 'OTP generated but WhatsApp delivery failed. Please check WhatsApp configuration.',
        debug: process.env.NODE_ENV === 'development' ? { otp } : undefined
      });
    }

    console.log(`✅ OTP sent successfully to ${phone}`);

    res.status(200).json({
      success: true,
      message: 'OTP sent to your WhatsApp successfully',
      phone: phone.replace(/.(?=.{4})/g, '*'), // Mask phone number: 919876543210 -> *******3210
      // In development mode with template limitation, show OTP in response
      debug: (process.env.NODE_ENV === 'development' && whatsappResult.developmentMode) ? {
        otp: otp,
        note: 'You will receive "Hello World" message. Use this OTP to reset password.',
        whatsappLimitation: 'Development mode only supports template messages'
      } : undefined
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    next(error);
  }
};

// @desc    Verify OTP and reset password
// @route   POST /api/password-reset/verify
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { phone, otp, newPassword } = req.body;

    if (!phone || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide phone number, OTP, and new password'
      });
    }

    // Validate phone number format
    const phoneRegex = /^[1-9]\d{9,14}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    // Get OTP data
    const otpData = otpStore.get(phone);

    if (!otpData) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired or not found. Please request a new one.'
      });
    }

    // Check if OTP expired
    if (Date.now() > otpData.expiresAt) {
      otpStore.delete(phone);
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    // Check attempts (max 3 attempts)
    if (otpData.attempts >= 3) {
      otpStore.delete(phone);
      return res.status(400).json({
        success: false,
        message: 'Maximum OTP verification attempts exceeded. Please request a new OTP.'
      });
    }

    // Verify OTP
    if (otpData.otp !== otp) {
      otpData.attempts += 1;
      otpStore.set(phone, otpData);
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${3 - otpData.attempts} attempts remaining.`
      });
    }

    // OTP is valid - update password
    const user = await User.findById(otpData.userId);

    if (!user) {
      otpStore.delete(phone);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // SECURITY: Verify that the user's phone matches the one in the request
    if (user.phone !== phone) {
      otpStore.delete(phone);
      console.error(`❌ Security Alert: Phone mismatch - Stored: ${user.phone} vs Request: ${phone}`);
      return res.status(403).json({
        success: false,
        message: 'Security verification failed. Please contact admin.'
      });
    }

    // SECURITY: Ensure user is still an employee (in case role changed)
    if (user.role !== 'intern') {
      otpStore.delete(phone);
      return res.status(403).json({
        success: false,
        message: 'This feature is only available for interns.'
      });
    }

    // Validate password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Update password
    user.password = newPassword; // Will be hashed by pre-save middleware
    await user.save();

    // Clear OTP from store
    otpStore.delete(phone);

    console.log(`✅ Password reset successful - User: ${user.email} | Phone: ${phone} | Role: ${user.role}`);

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    next(error);
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
exports.resendOTP = async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide phone number'
      });
    }

    // Check if there's existing OTP
    const existingOTP = otpStore.get(phone);
    if (existingOTP && Date.now() < existingOTP.expiresAt) {
      const timeLeft = Math.ceil((existingOTP.expiresAt - Date.now()) / 1000 / 60);
      return res.status(400).json({
        success: false,
        message: `Please wait ${timeLeft} minutes before requesting a new OTP`
      });
    }

    // Call the original request function
    return exports.requestPasswordReset(req, res, next);
  } catch (error) {
    console.error('Resend OTP error:', error);
    next(error);
  }
};
