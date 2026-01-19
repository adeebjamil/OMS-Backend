const express = require('express');
const {
  getAdminDashboard,
  getInternDashboard
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/admin', authorize('admin'), getAdminDashboard);
router.get('/intern', getInternDashboard);

module.exports = router;
