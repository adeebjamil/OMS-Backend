const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getInterns,
  uploadUserAvatar
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const multer = require('multer');

// Configure multer for memory storage (for Supabase upload)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for avatars
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

const router = express.Router();

router.use(protect); // All routes require authentication

router.get('/interns', authorize('admin'), getInterns);
router.route('/')
  .get(getUsers)
  .post(authorize('admin'), createUser);

// Avatar upload route
router.post('/:id/avatar', upload.single('avatar'), uploadUserAvatar);

router.route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(authorize('admin'), deleteUser);

module.exports = router;
