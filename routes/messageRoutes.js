const express = require('express');
const {
  getMessages,
  sendMessage,
  markAsRead,
  getConversations
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getMessages)
  .post(sendMessage);

router.get('/conversations', getConversations);
router.put('/:id/read', markAsRead);

module.exports = router;
