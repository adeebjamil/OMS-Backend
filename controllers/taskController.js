const TaskService = require('../services/TaskService');
const TeamService = require('../services/TeamService');
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

    // Handle team assignment
    if (req.body.assignmentType === 'team' && req.body.assignedTeam) {
      const team = await TeamService.findById(req.body.assignedTeam);
      if (!team) {
        return res.status(404).json({
          success: false,
          message: 'Team not found'
        });
      }
      // Auto-assign task to the team leader
      req.body.assignedTo = team.teamLeader;
    }

    const task = await TaskService.create(req.body);
    
    // Get the full task with populated data
    const fullTask = await TaskService.findById(task.id);

    // Create notification for assigned user (team leader if team task)
    if (fullTask.assignedTo && fullTask.assignedTo.id) {
      try {
        const notifMessage = fullTask.assignmentType === 'team' && fullTask.assignedTeam
          ? `A new team task has been assigned to your team "${fullTask.assignedTeam.teamName}": "${fullTask.title}"`
          : `You have been assigned a new task: "${fullTask.title}"`;
        const notifTitle = fullTask.assignmentType === 'team' ? 'New Team Task Assigned' : 'New Task Assigned';

        await createNotification({
          userId: fullTask.assignedTo.id,
          type: 'task_assigned',
          title: notifTitle,
          message: notifMessage,
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

// @desc    Delegate team task to team members
// @route   POST /api/tasks/:id/delegate
// @access  Private (Team Leader only)
exports.delegateTask = async (req, res, next) => {
  try {
    const { memberIds } = req.body;
    const parentTask = await TaskService.findById(req.params.id);

    if (!parentTask) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Verify this is a team task
    if (parentTask.assignmentType !== 'team') {
      return res.status(400).json({
        success: false,
        message: 'Only team tasks can be delegated'
      });
    }

    // Verify the current user is the team leader (assigned_to of this task)
    const assignedToId = parentTask.assignedTo?.id || parentTask.assignedTo;
    if (assignedToId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the Team Leader can delegate this task'
      });
    }

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one team member'
      });
    }

    // Verify all members are part of the team
    const team = await TeamService.findById(parentTask.assignedTeam?.id || parentTask.assignedTeam);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    const teamMemberIds = team.members || [];
    const invalidMembers = memberIds.filter(id => !teamMemberIds.includes(id));
    if (invalidMembers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some selected members are not part of this team'
      });
    }

    // Create sub-tasks for each selected member
    const subTasks = memberIds.map(memberId => ({
      title: parentTask.title,
      description: parentTask.description,
      assignedTo: memberId,
      assignedBy: parentTask.assignedBy?.id || parentTask.assignedBy,
      assignedTeam: parentTask.assignedTeam?.id || parentTask.assignedTeam,
      assignmentType: 'team',
      parentTaskId: parentTask.id,
      delegatedBy: req.user.id,
      priority: parentTask.priority,
      dueDate: parentTask.dueDate,
      tags: parentTask.tags || [],
    }));

    const createdTasks = await TaskService.createMany(subTasks);

    // Send notifications to each member
    for (const memberId of memberIds) {
      try {
        await createNotification({
          userId: memberId,
          type: 'task_assigned',
          title: 'New Task Delegated',
          message: `Your Team Leader has delegated a task to you: "${parentTask.title}"`,
          relatedId: parentTask.id,
          relatedModel: 'Task',
          link: `/dashboard/tasks`,
          priority: parentTask.priority === 'urgent' ? 'urgent' : parentTask.priority === 'high' ? 'high' : 'normal',
          createdBy: req.user.id
        });
      } catch (notifError) {
        console.error('❌ Error creating delegation notification:', notifError);
      }
    }

    // Fetch fully populated sub-tasks
    const populatedSubTasks = await TaskService.findSubTasks(parentTask.id);

    res.status(201).json({
      success: true,
      message: `Task delegated to ${memberIds.length} team member(s)`,
      data: populatedSubTasks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get sub-tasks for a parent task
// @route   GET /api/tasks/:id/subtasks
// @access  Private
exports.getSubTasks = async (req, res, next) => {
  try {
    const subTasks = await TaskService.findSubTasks(req.params.id);

    res.status(200).json({
      success: true,
      count: subTasks.length,
      data: subTasks
    });
  } catch (error) {
    next(error);
  }
};
