const express = require('express');
const {
  checkIn,
  checkOut,
  getAttendance,
  requestLeave,
  approveLeave,
  getAttendanceStats
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/checkin', checkIn);
router.put('/checkout', checkOut);
router.get('/', getAttendance);
router.post('/leave', requestLeave);
router.put('/leave/:id', authorize('admin'), approveLeave);
router.get('/stats', getAttendanceStats);
router.get('/stats/:userId', getAttendanceStats);

module.exports = router;
