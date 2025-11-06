const express = require('express');
const {
  getWorkLogs,
  getWorkLog,
  createWorkLog,
  updateWorkLog,
  deleteWorkLog,
  addFeedback
} = require('../controllers/workLogController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // All routes require authentication

router.put('/:id/feedback', authorize('admin'), addFeedback);

router.route('/')
  .get(getWorkLogs)
  .post(createWorkLog);

router.route('/:id')
  .get(getWorkLog)
  .put(updateWorkLog)
  .delete(deleteWorkLog);

module.exports = router;
