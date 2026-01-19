const AttendanceService = require('../services/AttendanceService');
const UserService = require('../services/UserService');

// @desc    Check in
// @route   POST /api/attendance/checkin
// @access  Private
exports.checkIn = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const existingAttendance = await AttendanceService.findOne({
      userId: req.user.id,
      date: { $gte: today }
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'You have already checked in today'
      });
    }

    const attendance = await AttendanceService.create({
      userId: req.user.id,
      date: new Date().toISOString().split('T')[0],
      checkIn: new Date().toISOString(),
      status: 'present'
    });

    res.status(201).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check out
// @route   PUT /api/attendance/checkout
// @access  Private
exports.checkOut = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await AttendanceService.findOne({
      userId: req.user.id,
      date: { $gte: today },
      checkOut: null
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'No check-in record found for today'
      });
    }

    attendance.checkOut = new Date().toISOString();
    const updated = await AttendanceService.save(attendance);

    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get attendance records
// @route   GET /api/attendance
// @access  Private
exports.getAttendance = async (req, res, next) => {
  try {
    const { userId, startDate, endDate, status } = req.query;
    const filters = {};

    // If user is intern, only show their own records
    if (req.user.role === 'intern') {
      filters.userId = req.user.id;
    } else if (userId) {
      filters.userId = userId;
    }

    if (startDate && endDate) {
      filters.startDate = startDate;
      filters.endDate = endDate;
    }

    if (status) {
      filters.status = status;
    }

    const attendance = await AttendanceService.find(filters);

    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Request leave
// @route   POST /api/attendance/leave
// @access  Private
exports.requestLeave = async (req, res, next) => {
  try {
    const { date, leaveType, leaveReason } = req.body;

    const attendance = await AttendanceService.create({
      userId: req.user.id,
      date,
      checkIn: new Date(date).toISOString(),
      status: 'leave',
      leaveType,
      leaveReason,
      leaveApproved: null
    });

    res.status(201).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve/Reject leave
// @route   PUT /api/attendance/leave/:id
// @access  Private/Admin
exports.approveLeave = async (req, res, next) => {
  try {
    const { approved } = req.body;

    const attendance = await AttendanceService.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    attendance.leaveApproved = approved;
    attendance.approvedBy = req.user.id;
    const updated = await AttendanceService.save(attendance);

    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get attendance statistics
// @route   GET /api/attendance/stats/:userId
// @access  Private
exports.getAttendanceStats = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.user.id;

    const totalDays = await AttendanceService.countDocuments({ userId });
    const presentDays = await AttendanceService.countDocuments({ userId, status: 'present' });
    const absentDays = await AttendanceService.countDocuments({ userId, status: 'absent' });
    const leaveDays = await AttendanceService.countDocuments({ userId, status: 'leave' });

    const totalHours = await AttendanceService.sumTotalHours(userId);
    const avgHours = totalDays > 0 ? totalHours / totalDays : 0;

    res.status(200).json({
      success: true,
      data: {
        totalDays,
        presentDays,
        absentDays,
        leaveDays,
        attendancePercentage: totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(2) : 0,
        totalHours: totalHours.toFixed(2),
        averageHoursPerDay: avgHours.toFixed(2)
      }
    });
  } catch (error) {
    next(error);
  }
};
