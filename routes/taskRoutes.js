const express = require('express');
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  addComment,
  getTaskStats,
  delegateTask,
  getSubTasks
} = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getTasks)
  .post(authorize('admin'), createTask);

router.get('/stats', getTaskStats);
router.get('/stats/:userId', getTaskStats);

router.route('/:id')
  .get(getTask)
  .put(updateTask)
  .delete(authorize('admin'), deleteTask);

router.post('/:id/comments', addComment);
router.post('/:id/delegate', delegateTask);
router.get('/:id/subtasks', getSubTasks);

module.exports = router;
