const User = require('../models/User');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, college, department, internshipRole, startDate, endDate } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role,
      phone,
      college,
      department,
      internshipRole,
      startDate,
      endDate
    });

    // Generate token and send response
    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Login attempt:', { email, password: password ? '***' : 'MISSING' });

    // Validate email & password
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Please provide an email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    
    console.log('👤 User found:', user ? `Yes (${user.email}, Status: ${user.status})` : 'No');

    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check if user status is active
    if (user.status !== 'active') {
      console.log('❌ User status is:', user.status);
      return res.status(401).json({
        success: false,
        message: 'Your account is inactive. Please contact administrator.'
      });
    }

    // Check if password matches
    console.log('🔑 Checking password...');
    console.log('Entered password length:', password.length);
    console.log('Stored password hash:', user.password ? user.password.substring(0, 30) + '...' : 'NO HASH');
    
    let isMatch = false;
    try {
      isMatch = await user.comparePassword(password);
      console.log('🔑 Password match:', isMatch ? 'YES ✅' : 'NO ❌');
    } catch (compareError) {
      console.error('❌ Password comparison error:', compareError.message);
      return res.status(500).json({
        success: false,
        message: 'Error verifying password'
      });
    }

    if (!isMatch) {
      console.log('❌ Password incorrect');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('✅ Login successful for:', user.email);
    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('❌ Login error:', error.message);
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
exports.updateDetails = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      college: req.body.college,
      department: req.body.department,
      address: req.body.address,
      emergencyContact: req.body.emergencyContact
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    if (!(await user.comparePassword(req.body.currentPassword))) {
      return res.status(401).json({
        success: false,
        message: 'Password is incorrect'
      });
    }

    user.password = req.body.newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    data: {}
  });
};

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.generateToken();

  const options = {
    expires: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    sameSite: 'strict'
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        internId: user.internId,
        avatar: user.avatar,
        phone: user.phone,
        college: user.college,
        department: user.department,
        internshipRole: user.internshipRole,
        startDate: user.startDate,
        endDate: user.endDate,
        status: user.status,
        address: user.address,
        createdAt: user.createdAt
      }
    });
};
