const MessageService = require('../services/MessageService');
const AnnouncementService = require('../services/AnnouncementService');

// @desc    Get all messages
// @route   GET /api/messages
// @access  Private
exports.getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.query;
    const filters = {
      $or: [
        { sender: req.user.id },
        { recipient: req.user.id }
      ]
    };

    if (conversationId) {
      filters.conversationId = conversationId;
    }

    const messages = await MessageService.find(filters);

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send message
// @route   POST /api/messages
// @access  Private
exports.sendMessage = async (req, res, next) => {
  try {
    req.body.sender = req.user.id;

    // Generate conversation ID if not provided
    if (!req.body.conversationId) {
      const ids = [req.user.id, req.body.recipient].sort();
      req.body.conversationId = `${ids[0]}_${ids[1]}`;
    }

    const message = await MessageService.create(req.body);

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark message as read
// @route   PUT /api/messages/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const message = await MessageService.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    const recipientId = message.recipient?.id || message.recipient;
    if (recipientId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    message.isRead = true;
    message.readAt = new Date().toISOString();
    const updated = await MessageService.save(message);

    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get conversations
// @route   GET /api/messages/conversations
// @access  Private
exports.getConversations = async (req, res, next) => {
  try {
    const conversations = await MessageService.getConversations(req.user.id);

    res.status(200).json({
      success: true,
      count: conversations.length,
      data: conversations
    });
  } catch (error) {
    next(error);
  }
};

// ============ ANNOUNCEMENTS ============

// @desc    Get all announcements
// @route   GET /api/announcements
// @access  Private
exports.getAnnouncements = async (req, res, next) => {
  try {
    const filters = {
      isActive: true,
      $or: [
        { targetAudience: 'all' },
        { targetAudience: req.user.role === 'admin' ? 'admins' : 'interns' }
      ]
    };

    const announcements = await AnnouncementService.find(filters);

    res.status(200).json({
      success: true,
      count: announcements.length,
      data: announcements
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create announcement
// @route   POST /api/announcements
// @access  Private/Admin
exports.createAnnouncement = async (req, res, next) => {
  try {
    req.body.publishedBy = req.user.id;

    const announcement = await AnnouncementService.create(req.body);

    res.status(201).json({
      success: true,
      data: announcement
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark announcement as read
// @route   PUT /api/announcements/:id/read
// @access  Private
exports.markAnnouncementAsRead = async (req, res, next) => {
  try {
    const announcement = await AnnouncementService.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Check if already read
    const alreadyRead = announcement.readBy?.some(r => r.userId === req.user.id);
    
    if (!alreadyRead) {
      const updated = await AnnouncementService.markAsRead(req.params.id, req.user.id);
      return res.status(200).json({
        success: true,
        data: updated
      });
    }

    res.status(200).json({
      success: true,
      data: announcement
    });
  } catch (error) {
    next(error);
  }
};
