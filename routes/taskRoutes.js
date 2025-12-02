const express = require('express');
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  addComment,
  getTaskStats
} = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // All routes require authentication

router.get('/stats/:userId', getTaskStats);
router.get('/stats', getTaskStats);
router.post('/:id/comments', addComment);

router.route('/')
  .get(getTasks)
  .post(authorize('admin'), createTask);

router.route('/:id')
  .get(getTask)
  .put(updateTask)
  .delete(authorize('admin'), deleteTask);

module.exports = router;
