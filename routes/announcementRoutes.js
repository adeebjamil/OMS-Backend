const express = require('express');
const {
  getAnnouncements,
  createAnnouncement,
  markAnnouncementAsRead
} = require('../controllers/messageController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // All routes require authentication

router.put('/:id/read', markAnnouncementAsRead);
router.route('/')
  .get(getAnnouncements)
  .post(authorize('admin'), createAnnouncement);

module.exports = router;
