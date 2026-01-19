const TaskService = require('../services/TaskService');
const { createNotification } = require('./notificationController');

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res, next) => {
  try {
    const { status, priority, assignedTo } = req.query;
    const filters = {};

    // If user is employee, only show tasks assigned to them
    if (req.user.role === 'intern') {
      filters.assignedTo = req.user.id;
    } else if (assignedTo) {
      filters.assignedTo = assignedTo;
    }

    if (status) filters.status = status;
    if (priority) filters.priority = priority;

    const tasks = await TaskService.find(filters);

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
    const task = await TaskService.findById(req.params.id);

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

    const task = await TaskService.create(req.body);
    
    // Get the full task with populated data
    const fullTask = await TaskService.findById(task.id);

    // Create notification for assigned user
    if (fullTask.assignedTo && fullTask.assignedTo.id) {
      try {
        await createNotification({
          userId: fullTask.assignedTo.id,
          type: 'task_assigned',
          title: 'New Task Assigned',
          message: `You have been assigned a new task: "${fullTask.title}"`,
          relatedId: fullTask.id,
          relatedModel: 'Task',
          link: `/dashboard/tasks`,
          priority: fullTask.priority === 'urgent' ? 'urgent' : fullTask.priority === 'high' ? 'high' : 'normal',
          createdBy: req.user.id
        });
        console.log('✅ Task assignment notification created');
      } catch (notifError) {
        console.error('❌ Error creating task notification:', notifError);
      }
    }

    res.status(201).json({
      success: true,
      data: fullTask
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
    let task = await TaskService.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Only admin or assigned user can update
    const assignedToId = task.assignedTo?.id || task.assignedTo;
    if (req.user.role !== 'admin' && assignedToId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this task'
      });
    }

    const oldStatus = task.status;
    
    task = await TaskService.findByIdAndUpdate(req.params.id, req.body);

    // Create notification if task status changed to completed
    const assignedById = task.assignedBy?.id || task.assignedBy;
    if (oldStatus !== 'completed' && task.status === 'completed' && assignedById) {
      try {
        const assignedToName = task.assignedTo?.name || 'User';
        await createNotification({
          userId: assignedById,
          type: 'task_completed',
          title: 'Task Completed',
          message: `${assignedToName} has completed the task: "${task.title}"`,
          relatedId: task.id,
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
    const task = await TaskService.findByIdAndDelete(req.params.id);

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
    const task = await TaskService.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const updatedTask = await TaskService.addComment(req.params.id, req.user.id, req.body.comment);

    res.status(200).json({
      success: true,
      data: updatedTask
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
    const filters = { assignedTo: userId };

    const total = await TaskService.countDocuments(filters);
    const completed = await TaskService.countDocuments({ ...filters, status: 'completed' });
    const pending = await TaskService.countDocuments({ ...filters, status: 'pending' });
    const inProgress = await TaskService.countDocuments({ ...filters, status: 'in-progress' });

    res.status(200).json({
      success: true,
      data: {
        total,
        completed,
        pending,
        inProgress,
        completionRate: total > 0 ? ((completed / total) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    next(error);
  }
};
