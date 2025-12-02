const Message = require('../models/Message');
const Announcement = require('../models/Announcement');

// @desc    Get all messages
// @route   GET /api/messages
// @access  Private
exports.getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.query;
    let query = {
      $or: [
        { sender: req.user.id },
        { recipient: req.user.id }
      ]
    };

    if (conversationId) {
      query.conversationId = conversationId;
    }

    const messages = await Message.find(query)
      .populate('sender', 'name email avatar')
      .populate('recipient', 'name email avatar')
      .sort({ createdAt: -1 });

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

    const message = await Message.create(req.body);

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
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    if (message.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    message.isRead = true;
    message.readAt = new Date();
    await message.save();

    res.status(200).json({
      success: true,
      data: message
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
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: req.user._id },
            { recipient: req.user._id }
          ]
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$recipient', req.user._id] },
                  { $eq: ['$isRead', false] }
                ]},
                1,
                0
              ]
            }
          }
        }
      }
    ]);

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
    const query = {
      isActive: true,
      $or: [
        { targetAudience: 'all' },
        { targetAudience: req.user.role === 'admin' ? 'admins' : 'employees' }
      ]
    };

    const announcements = await Announcement.find(query)
      .populate('publishedBy', 'name email')
      .sort({ createdAt: -1 });

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

    const announcement = await Announcement.create(req.body);

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
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Check if already read
    const alreadyRead = announcement.readBy.some(
      item => item.userId.toString() === req.user.id
    );

    if (!alreadyRead) {
      announcement.readBy.push({ userId: req.user.id });
      await announcement.save();
    }

    res.status(200).json({
      success: true,
      data: announcement
    });
  } catch (error) {
    next(error);
  }
};
