const Attendance = require('../models/Attendance');
const User = require('../models/User');

// @desc    Check in
// @route   POST /api/attendance/checkin
// @access  Private
exports.checkIn = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      userId: req.user.id,
      date: { $gte: today }
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'You have already checked in today'
      });
    }

    const attendance = await Attendance.create({
      userId: req.user.id,
      date: new Date(),
      checkIn: new Date(),
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

    const attendance = await Attendance.findOne({
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

    attendance.checkOut = new Date();
    await attendance.save();

    res.status(200).json({
      success: true,
      data: attendance
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
    let query = {};

    // If user is intern, only show their own records
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

    if (status) {
      query.status = status;
    }

    const attendance = await Attendance.find(query)
      .populate('userId', 'name email')
      .sort({ date: -1 });

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

    const attendance = await Attendance.create({
      userId: req.user.id,
      date,
      checkIn: new Date(date),
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

    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    attendance.leaveApproved = approved;
    attendance.approvedBy = req.user.id;
    await attendance.save();

    res.status(200).json({
      success: true,
      data: attendance
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

    const totalDays = await Attendance.countDocuments({ userId });
    const presentDays = await Attendance.countDocuments({ userId, status: 'present' });
    const absentDays = await Attendance.countDocuments({ userId, status: 'absent' });
    const leaveDays = await Attendance.countDocuments({ userId, status: 'leave' });

    const attendanceRecords = await Attendance.find({ userId, totalHours: { $gt: 0 } });
    const totalHours = attendanceRecords.reduce((sum, record) => sum + record.totalHours, 0);
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
