const express = require('express');
const {
  getAnnouncements,
  createAnnouncement,
  markAnnouncementAsRead
} = require('../controllers/messageController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getAnnouncements)
  .post(authorize('admin'), createAnnouncement);

router.put('/:id/read', markAnnouncementAsRead);

module.exports = router;
