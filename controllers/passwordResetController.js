const UserService = require('../services/UserService');
const { sendOTPEmail } = require('../config/email');

// In-memory OTP storage (in production, use Redis or database)
const otpStore = new Map();

// Generate 4-digit OTP
const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// @desc    Check email and get user info
// @route   POST /api/password-reset/check-email
// @access  Public
exports.checkEmail = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user by email
    const user = await UserService.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address'
      });
    }

    // Return user info (name and employee ID)
    res.status(200).json({
      success: true,
      data: {
        name: user.name,
        employeeId: user.internId || user.employeeId || (user.role === 'admin' ? 'ADMIN' : 'N/A'),
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send OTP to email
// @route   POST /api/password-reset/send-otp
// @access  Public
exports.sendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user by email
    const user = await UserService.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address'
      });
    }

    // Generate 4-digit OTP
    const otp = generateOTP();
    
    // Store OTP with expiry (10 minutes)
    otpStore.set(email.toLowerCase(), {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      attempts: 0,
      userId: user._id || user.id
    });

    // Send OTP via email
    try {
      await sendOTPEmail(email, otp, user.name);
      
      console.log(`✅ OTP sent to ${email}: ${otp}`);
      
      res.status(200).json({
        success: true,
        message: 'OTP has been sent to your email address'
      });
    } catch (emailError) {
      console.error('❌ Failed to send OTP email:', emailError);
      
      // Clear the stored OTP since email failed
      otpStore.delete(email.toLowerCase());
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again later.'
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP
// @route   POST /api/password-reset/verify-otp
// @access  Public
exports.verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    const storedData = otpStore.get(email.toLowerCase());

    if (!storedData) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired or not found. Please request a new OTP.'
      });
    }

    // Check if OTP expired
    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(email.toLowerCase());
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new OTP.'
      });
    }

    // Check attempts (max 3)
    if (storedData.attempts >= 3) {
      otpStore.delete(email.toLowerCase());
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.'
      });
    }

    // Verify OTP
    if (storedData.otp !== otp) {
      storedData.attempts += 1;
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${3 - storedData.attempts} attempts remaining.`
      });
    }

    // OTP is valid - mark as verified
    storedData.verified = true;
    
    res.status(200).json({
      success: true,
      message: 'OTP verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password after OTP verification
// @route   POST /api/password-reset/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;

    if (!email || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, new password, and confirm password are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const storedData = otpStore.get(email.toLowerCase());

    if (!storedData || !storedData.verified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify OTP first'
      });
    }

    // Find user and update password
    const user = await UserService.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Hash the new password and update
    const hashedPassword = await UserService.hashPassword(newPassword);
    await UserService.findByIdAndUpdate(user._id || user.id, { password: hashedPassword });

    // Clear OTP data
    otpStore.delete(email.toLowerCase());

    console.log(`✅ Password reset successful for ${email}`);

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend OTP
// @route   POST /api/password-reset/resend-otp
// @access  Public
exports.resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Delete existing OTP
    otpStore.delete(email.toLowerCase());

    // Call sendOTP to generate and send new OTP
    req.body.email = email;
    return exports.sendOTP(req, res, next);
  } catch (error) {
    next(error);
  }
};
