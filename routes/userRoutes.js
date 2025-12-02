const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getInterns
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { uploadAvatar } = require('../config/cloudinary');

const router = express.Router();

router.use(protect); // All routes require authentication

router.get('/interns', authorize('admin'), getInterns);
router.route('/')
  .get(getUsers) // Allow all authenticated users to view user list
  .post(authorize('admin'), createUser);

// Avatar upload route
router.post('/:id/avatar', uploadAvatar.single('avatar'), async (req, res, next) => {
  try {
    const User = require('../models/User');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file'
      });
    }

    // Check authorization
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this user'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { avatar: req.file.path },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
});

router.route('/:id')
  .get(getUser)
  .put(updateUser) // Allow users to update their own profile
  .delete(authorize('admin'), deleteUser);

module.exports = router;
