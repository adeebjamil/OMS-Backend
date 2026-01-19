const UserService = require('../services/UserService');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, college, department, internshipRole, startDate, endDate } = req.body;

    // Check if user exists
    const existingUser = await UserService.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user
    const user = await UserService.create({
      name,
      email: email.toLowerCase(),
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

    // Check for user (include password for verification)
    const user = await UserService.findByEmail(email, true);
    
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
    
    let isMatch = false;
    try {
      isMatch = await UserService.comparePassword(password, user.password);
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
    
    // Remove password before sending
    delete user.password;
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
    const user = await UserService.findById(req.user.id);

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

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key => 
      fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    const user = await UserService.findByIdAndUpdate(req.user.id, fieldsToUpdate);

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
    const user = await UserService.findById(req.user.id, true);

    // Check current password
    const isMatch = await UserService.comparePassword(req.body.currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Password is incorrect'
      });
    }

    // Update password
    await UserService.findByIdAndUpdate(req.user.id, {
      password: req.body.newPassword
    });

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = UserService.generateToken(user);

  const options = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  // Remove password from user object
  const userData = { ...user };
  delete userData.password;

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      data: userData
    });
};
