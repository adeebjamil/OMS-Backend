const WorkLog = require('../models/WorkLog');

// @desc    Get all work logs
// @route   GET /api/worklogs
// @access  Private
exports.getWorkLogs = async (req, res, next) => {
  try {
    const { userId, startDate, endDate, status } = req.query;
    let query = {};

    // If user is employee, only show their own logs
    if (req.user.role === 'intern') {
      query.userId = req.user.id;
    } else if (userId) {
      query.userId = userId;
    }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (status) query.status = status;

    const workLogs = await WorkLog.find(query)
      .populate('userId', 'name email')
      .populate('tasksCompleted', 'title')
      .populate('feedback.reviewedBy', 'name email')
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: workLogs.length,
      data: workLogs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single work log
// @route   GET /api/worklogs/:id
// @access  Private
exports.getWorkLog = async (req, res, next) => {
  try {
    const workLog = await WorkLog.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('tasksCompleted')
      .populate('feedback.reviewedBy', 'name email');

    if (!workLog) {
      return res.status(404).json({
        success: false,
        message: 'Work log not found'
      });
    }

    res.status(200).json({
      success: true,
      data: workLog
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create work log
// @route   POST /api/worklogs
// @access  Private
exports.createWorkLog = async (req, res, next) => {
  try {
    req.body.userId = req.user.id;

    const workLog = await WorkLog.create(req.body);

    res.status(201).json({
      success: true,
      data: workLog
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update work log
// @route   PUT /api/worklogs/:id
// @access  Private
exports.updateWorkLog = async (req, res, next) => {
  try {
    let workLog = await WorkLog.findById(req.params.id);

    if (!workLog) {
      return res.status(404).json({
        success: false,
        message: 'Work log not found'
      });
    }

    // Only owner can update
    if (workLog.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this work log'
      });
    }

    workLog = await WorkLog.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: workLog
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete work log
// @route   DELETE /api/worklogs/:id
// @access  Private
exports.deleteWorkLog = async (req, res, next) => {
  try {
    const workLog = await WorkLog.findById(req.params.id);

    if (!workLog) {
      return res.status(404).json({
        success: false,
        message: 'Work log not found'
      });
    }

    // Only owner can delete
    if (workLog.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this work log'
      });
    }

    await workLog.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add feedback to work log
// @route   PUT /api/worklogs/:id/feedback
// @access  Private/Admin
exports.addFeedback = async (req, res, next) => {
  try {
    const workLog = await WorkLog.findById(req.params.id);

    if (!workLog) {
      return res.status(404).json({
        success: false,
        message: 'Work log not found'
      });
    }

    workLog.feedback = {
      reviewedBy: req.user.id,
      comment: req.body.comment,
      rating: req.body.rating,
      reviewedAt: new Date()
    };
    workLog.status = 'reviewed';

    await workLog.save();

    res.status(200).json({
      success: true,
      data: workLog
    });
  } catch (error) {
    next(error);
  }
};
