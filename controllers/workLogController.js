const WorkLogService = require('../services/WorkLogService');
const UserService = require('../services/UserService');
const { createNotification } = require('./notificationController');

// @desc    Get all work logs
// @route   GET /api/worklogs
// @access  Private
exports.getWorkLogs = async (req, res, next) => {
  try {
    const { userId, startDate, endDate, status } = req.query;
    const filters = {};

    // If user is employee, only show their own logs
    if (req.user.role === 'intern') {
      filters.userId = req.user.id;
    } else if (userId) {
      filters.userId = userId;
    }

    if (startDate && endDate) {
      filters.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (status) filters.status = status;

    const workLogs = await WorkLogService.find(filters);

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
    const workLog = await WorkLogService.findById(req.params.id);

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

    const workLog = await WorkLogService.create(req.body);

    // Create notification for admins when an employee submits a work log
    try {
      // Get all admins
      const admins = await UserService.find({ role: 'admin', status: 'active' });
      
      for (const admin of admins) {
        await createNotification({
          userId: admin._id || admin.id,
          type: 'worklog_submitted',
          title: 'New Work Log Submitted',
          message: `${req.user.name} has submitted a work log for ${new Date(workLog.date).toLocaleDateString()}`,
          relatedId: workLog._id || workLog.id,
          relatedModel: 'WorkLog',
          link: '/dashboard/worklogs',
          createdBy: req.user.id
        });
      }
      console.log('✅ Work log submission notification created for admins');
    } catch (notifError) {
      console.error('❌ Error creating work log notification:', notifError);
    }

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
    let workLog = await WorkLogService.findById(req.params.id);

    if (!workLog) {
      return res.status(404).json({
        success: false,
        message: 'Work log not found'
      });
    }

    // Only owner can update
    const workLogUserId = workLog.userId?.id || workLog.userId;
    if (workLogUserId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this work log'
      });
    }

    workLog = await WorkLogService.findByIdAndUpdate(req.params.id, req.body);

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
    const workLog = await WorkLogService.findById(req.params.id);

    if (!workLog) {
      return res.status(404).json({
        success: false,
        message: 'Work log not found'
      });
    }

    // Only owner can delete
    const workLogUserId = workLog.userId?.id || workLog.userId;
    if (workLogUserId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this work log'
      });
    }

    await WorkLogService.deleteOne({ id: req.params.id });

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
    const workLog = await WorkLogService.findById(req.params.id);

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
      reviewedAt: new Date().toISOString()
    };
    workLog.status = 'reviewed';

    const updated = await WorkLogService.save(workLog);

    // Create notification for the employee that their work log has been reviewed
    try {
      const employeeId = workLog.userId?.id || workLog.userId;
      await createNotification({
        userId: employeeId,
        type: 'worklog_reviewed',
        title: 'Work Log Reviewed',
        message: `Your work log for ${new Date(workLog.date).toLocaleDateString()} has been reviewed${req.body.rating ? ` with a rating of ${req.body.rating}/5` : ''}`,
        relatedId: workLog._id || workLog.id,
        relatedModel: 'WorkLog',
        link: '/dashboard/worklogs',
        createdBy: req.user.id
      });
      console.log('✅ Work log review notification created for employee');
    } catch (notifError) {
      console.error('❌ Error creating work log review notification:', notifError);
    }

    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};
