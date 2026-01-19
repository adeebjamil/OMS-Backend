const UserService = require('../services/UserService');
const TaskService = require('../services/TaskService');
const AttendanceService = require('../services/AttendanceService');
const WorkLogService = require('../services/WorkLogService');
const EvaluationService = require('../services/EvaluationService');

// @desc    Get admin dashboard statistics
// @route   GET /api/dashboard/admin
// @access  Private/Admin
exports.getAdminDashboard = async (req, res, next) => {
  try {
    // Total counts
    const totalInterns = await UserService.countDocuments({ role: 'intern' });
    const activeInterns = await UserService.countDocuments({ role: 'intern', status: 'active' });
    const totalTasks = await TaskService.countDocuments();
    const completedTasks = await TaskService.countDocuments({ status: 'completed' });

    // Today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAttendance = await AttendanceService.countDocuments({
      date: { $gte: today },
      status: 'present'
    });

    // Pending items
    const pendingLeaves = await AttendanceService.countDocuments({
      status: 'leave',
      leaveApproved: null
    });
    const pendingTasks = await TaskService.countDocuments({ status: 'pending' });
    const pendingWorkLogs = await WorkLogService.countDocuments({ status: 'submitted' });

    // Recent activities
    const recentTasks = await TaskService.find({});
    const recentWorkLogs = await WorkLogService.find({});

    // Task completion by intern (top 5)
    const taskStats = await TaskService.getStatsByUser();

    // Attendance statistics for the month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const attendanceStats = await AttendanceService.aggregateByStatus({
      date: { $gte: startOfMonth }
    });

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
          tasks: recentTasks.slice(0, 5),
          workLogs: recentWorkLogs.slice(0, 5)
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
    const totalTasks = await TaskService.countDocuments({ assignedTo: userId });
    const completedTasks = await TaskService.countDocuments({ 
      assignedTo: userId, 
      status: 'completed' 
    });
    const pendingTasks = await TaskService.countDocuments({ 
      assignedTo: userId, 
      status: 'pending' 
    });
    const inProgressTasks = await TaskService.countDocuments({ 
      assignedTo: userId, 
      status: 'in-progress' 
    });

    // Attendance statistics
    const totalDays = await AttendanceService.countDocuments({ userId });
    const presentDays = await AttendanceService.countDocuments({ 
      userId, 
      status: 'present' 
    });
    
    // Today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAttendance = await AttendanceService.findOne({
      userId,
      date: { $gte: today }
    });

    // Recent tasks
    const allTasks = await TaskService.find({ assignedTo: userId });
    const recentTasks = allTasks.slice(0, 5);

    // Upcoming tasks (due soon)
    const upcomingTasks = allTasks
      .filter(t => 
        (t.status === 'pending' || t.status === 'in-progress') &&
        new Date(t.dueDate) >= new Date()
      )
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5);

    // Work log statistics
    const totalWorkLogs = await WorkLogService.countDocuments({ userId });
    
    // Calculate total hours
    const hoursAggregation = await WorkLogService.aggregateHours(userId);
    const totalHours = hoursAggregation.length > 0 ? hoursAggregation[0].totalHours : 0;
    
    const avgRating = await WorkLogService.aggregateAvgRating(userId);

    // Latest evaluation
    const evaluations = await EvaluationService.find({
      internId: userId,
      isPublished: true
    });
    const latestEvaluation = evaluations.length > 0 ? evaluations[0] : null;

    res.status(200).json({
      success: true,
      data: {
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          pending: pendingTasks,
          inProgress: inProgressTasks,
          completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(2) : 0
        },
        attendance: {
          totalDays,
          presentDays,
          attendancePercentage: totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(2) : 100,
          today: todayAttendance ? {
            checkIn: todayAttendance.checkIn,
            checkOut: todayAttendance.checkOut,
            totalHours: todayAttendance.totalHours || 0,
            status: todayAttendance.status
          } : null
        },
        workLogs: {
          total: totalWorkLogs,
          totalHours: totalHours.toFixed(2),
          averageRating: avgRating.length > 0 ? avgRating[0].avgRating?.toFixed(1) : null
        },
        recentTasks,
        upcomingTasks,
        latestEvaluation: latestEvaluation ? {
          type: latestEvaluation.evaluationType,
          overallRating: latestEvaluation.overallRating,
          date: latestEvaluation.createdAt
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
};
