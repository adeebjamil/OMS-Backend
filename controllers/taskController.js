const Task = require('../models/Task');
const { createNotification } = require('./notificationController');

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res, next) => {
  try {
    const { status, priority, assignedTo } = req.query;
    let query = {};

    // If user is employee, only show tasks assigned to them
    if (req.user.role === 'intern') {
      query.assignedTo = req.user.id;
    } else if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
exports.getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
      .populate('comments.userId', 'name email');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create task
// @route   POST /api/tasks
// @access  Private/Admin
exports.createTask = async (req, res, next) => {
  try {
    req.body.assignedBy = req.user.id;

    const task = await Task.create(req.body);
    
    // Populate to get full data for notification
    await task.populate('assignedTo', 'name email');

    // Create notification for assigned user
    if (task.assignedTo && task.assignedTo._id) {
      try {
        await createNotification({
          userId: task.assignedTo._id,
          type: 'task_assigned',
          title: 'New Task Assigned',
          message: `You have been assigned a new task: "${task.title}"`,
          relatedId: task._id,
          relatedModel: 'Task',
          link: `/dashboard/tasks`,
          priority: task.priority === 'urgent' ? 'urgent' : task.priority === 'high' ? 'high' : 'normal',
          createdBy: req.user.id
        });
        console.log('✅ Task assignment notification created');
      } catch (notifError) {
        console.error('❌ Error creating task notification:', notifError);
      }
    }

    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
exports.updateTask = async (req, res, next) => {
  try {
    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Only admin or assigned user can update
    if (req.user.role !== 'admin' && task.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this task'
      });
    }

    const oldStatus = task.status;
    
    task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('assignedTo', 'name email').populate('assignedBy', 'name email');

    // Create notification if task status changed to completed
    if (oldStatus !== 'completed' && task.status === 'completed' && task.assignedBy) {
      try {
        await createNotification({
          userId: task.assignedBy._id,
          type: 'task_completed',
          title: 'Task Completed',
          message: `${task.assignedTo.name} has completed the task: "${task.title}"`,
          relatedId: task._id,
          relatedModel: 'Task',
          link: `/dashboard/tasks`,
          priority: 'normal',
          createdBy: req.user.id
        });
        console.log('✅ Task completion notification created');
      } catch (notifError) {
        console.error('❌ Error creating task completion notification:', notifError);
      }
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private/Admin
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add comment to task
// @route   POST /api/tasks/:id/comments
// @access  Private
exports.addComment = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    task.comments.push({
      userId: req.user.id,
      comment: req.body.comment
    });

    await task.save();

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get task statistics
// @route   GET /api/tasks/stats/:userId
// @access  Private
exports.getTaskStats = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.user.id;

    const totalTasks = await Task.countDocuments({ assignedTo: userId });
    const completedTasks = await Task.countDocuments({ assignedTo: userId, status: 'completed' });
    const pendingTasks = await Task.countDocuments({ assignedTo: userId, status: 'pending' });
    const inProgressTasks = await Task.countDocuments({ assignedTo: userId, status: 'in-progress' });

    res.status(200).json({
      success: true,
      data: {
        totalTasks,
        completedTasks,
        pendingTasks,
        inProgressTasks,
        completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    next(error);
  }
};
