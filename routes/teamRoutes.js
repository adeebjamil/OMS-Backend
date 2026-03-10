const express = require('express');
const {
  getTeams,
  getTeam,
  getMyTeam,
  createTeam,
  updateTeam,
  deleteTeam,
} = require('../controllers/teamController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // All routes require authentication

router.get('/my-team', getMyTeam);

router
  .route('/')
  .get(getTeams)
  .post(authorize('admin'), createTeam);

router
  .route('/:id')
  .get(getTeam)
  .put(authorize('admin'), updateTeam)
  .delete(authorize('admin'), deleteTeam);

module.exports = router;
