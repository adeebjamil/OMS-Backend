const express = require('express');
const {
  getMessages,
  sendMessage,
  markAsRead,
  getConversations,
  getAnnouncements,
  createAnnouncement,
  markAnnouncementAsRead
} = require('../controllers/messageController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // All routes require authentication

// Message routes
router.get('/conversations', getConversations);
router.put('/:id/read', markAsRead);
router.route('/')
  .get(getMessages)
  .post(sendMessage);

module.exports = router;
