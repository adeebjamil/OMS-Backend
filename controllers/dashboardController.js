const User = require('../models/User');
const Task = require('../models/Task');
const Attendance = require('../models/Attendance');
const WorkLog = require('../models/WorkLog');
const Evaluation = require('../models/Evaluation');

// @desc    Get admin dashboard statistics
// @route   GET /api/dashboard/admin
// @access  Private/Admin
exports.getAdminDashboard = async (req, res, next) => {
  try {
    // Total counts
    const totalInterns = await User.countDocuments({ role: 'intern' });
    const activeInterns = await User.countDocuments({ role: 'intern', status: 'active' });
    const totalTasks = await Task.countDocuments();
    const completedTasks = await Task.countDocuments({ status: 'completed' });

    // Today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAttendance = await Attendance.countDocuments({
      date: { $gte: today },
      status: 'present'
    });

    // Pending items
    const pendingLeaves = await Attendance.countDocuments({
      status: 'leave',
      leaveApproved: null
    });
    const pendingTasks = await Task.countDocuments({ status: 'pending' });
    const pendingWorkLogs = await WorkLog.countDocuments({ status: 'submitted' });

    // Recent activities
    const recentTasks = await Task.find()
      .populate('assignedTo', 'name')
      .populate('assignedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentWorkLogs = await WorkLog.find()
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    // Task completion by intern (top 5)
    const taskStats = await Task.aggregate([
      {
        $group: {
          _id: '$assignedTo',
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      },
      { $sort: { completed: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'intern'
        }
      },
      { $unwind: '$intern' }
    ]);

    // Attendance statistics for the month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const attendanceStats = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalInterns,
          activeInterns,
          totalTasks,
          completedTasks,
          todayAttendance,
          attendancePercentage: activeInterns > 0 
            ? ((todayAttendance / activeInterns) * 100).toFixed(2)
            : 0
        },
        pending: {
          leaves: pendingLeaves,
          tasks: pendingTasks,
          workLogs: pendingWorkLogs
        },
        recentActivities: {
          tasks: recentTasks,
          workLogs: recentWorkLogs
        },
        topPerformers: taskStats,
        monthlyAttendance: attendanceStats
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get intern dashboard statistics
// @route   GET /api/dashboard/intern
// @access  Private/Intern
exports.getInternDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Task statistics
    const totalTasks = await Task.countDocuments({ assignedTo: userId });
    const completedTasks = await Task.countDocuments({ 
      assignedTo: userId, 
      status: 'completed' 
    });
    const pendingTasks = await Task.countDocuments({ 
      assignedTo: userId, 
      status: 'pending' 
    });
    const inProgressTasks = await Task.countDocuments({ 
      assignedTo: userId, 
      status: 'in-progress' 
    });

    // Attendance statistics
    const totalDays = await Attendance.countDocuments({ userId });
    const presentDays = await Attendance.countDocuments({ 
      userId, 
      status: 'present' 
    });
    
    // Today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAttendance = await Attendance.findOne({
      userId,
      date: { $gte: today }
    });

    // Recent tasks
    const recentTasks = await Task.find({ assignedTo: userId })
      .populate('assignedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    // Upcoming tasks (due soon)
    const upcomingTasks = await Task.find({ 
      assignedTo: userId,
      status: { $in: ['pending', 'in-progress'] },
      dueDate: { $gte: new Date() }
    })
      .sort({ dueDate: 1 })
      .limit(5);

    // Work log statistics
    const totalWorkLogs = await WorkLog.countDocuments({ userId });
    
    // Calculate total hours
    const hoursAggregation = await WorkLog.aggregate([
      {
        $match: { 
          userId: req.user._id
        }
      },
      {
        $group: {
          _id: null,
          totalHours: { $sum: '$hoursWorked' }
        }
      }
    ]);
    
    const avgRating = await WorkLog.aggregate([
      {
        $match: { 
          userId: req.user._id,
          'feedback.rating': { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$feedback.rating' }
        }
      }
    ]);

    // Latest evaluation
    const latestEvaluation = await Evaluation.findOne({
      internId: userId,
      isPublished: true
    })
      .populate('evaluatedBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          pending: pendingTasks,
          inProgress: inProgressTasks,
          completionRate: totalTasks > 0 
            ? ((completedTasks / totalTasks) * 100).toFixed(2)
            : 0
        },
        attendance: {
          total: totalDays,
          present: presentDays,
          attendancePercentage: totalDays > 0 
            ? ((presentDays / totalDays) * 100).toFixed(2)
            : 0,
          today: todayAttendance
        },
        workLogs: {
          total: totalWorkLogs,
          totalHours: hoursAggregation.length > 0 
            ? hoursAggregation[0].totalHours 
            : 0,
          averageRating: avgRating.length > 0 
            ? avgRating[0].avgRating.toFixed(2)
            : null
        },
        recentTasks,
        upcomingTasks,
        latestEvaluation
      }
    });
  } catch (error) {
    next(error);
  }
};
