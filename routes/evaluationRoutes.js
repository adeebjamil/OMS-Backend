const express = require('express');
const {
  getEvaluations,
  getEvaluation,
  createEvaluation,
  updateEvaluation,
  deleteEvaluation,
  publishEvaluation
} = require('../controllers/evaluationController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // All routes require authentication

router.put('/:id/publish', authorize('admin'), publishEvaluation);

router.route('/')
  .get(getEvaluations)
  .post(authorize('admin'), createEvaluation);

router.route('/:id')
  .get(getEvaluation)
  .put(authorize('admin'), updateEvaluation)
  .delete(authorize('admin'), deleteEvaluation);

module.exports = router;
