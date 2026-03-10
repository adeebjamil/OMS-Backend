const TeamService = require('../services/TeamService');

// @desc    Get all teams
// @route   GET /api/teams
// @access  Private/Admin
exports.getTeams = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filters = {};
    if (status) filters.status = status;

    const teams = await TeamService.find(filters);

    res.status(200).json({
      success: true,
      count: teams.length,
      data: teams,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single team
// @route   GET /api/teams/:id
// @access  Private
exports.getTeam = async (req, res, next) => {
  try {
    const team = await TeamService.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    res.status(200).json({
      success: true,
      data: team,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create team
// @route   POST /api/teams
// @access  Private/Admin
exports.createTeam = async (req, res, next) => {
  try {
    const { teamName, description, teamLeader, members } = req.body;

    if (!teamName || !teamLeader || !members || members.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide team name, team leader, and at least one member',
      });
    }

    const teamData = {
      teamName,
      description: description || '',
      teamLeader,
      members,
      status: 'active',
      createdBy: req.user.id,
    };

    const team = await TeamService.create(teamData);

    // Re-fetch to get populated data
    const populatedTeam = await TeamService.findById(team.id);

    res.status(201).json({
      success: true,
      data: populatedTeam,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update team
// @route   PUT /api/teams/:id
// @access  Private/Admin
exports.updateTeam = async (req, res, next) => {
  try {
    const existing = await TeamService.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    const team = await TeamService.findByIdAndUpdate(req.params.id, req.body);

    res.status(200).json({
      success: true,
      data: team,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user's team info
// @route   GET /api/teams/my-team
// @access  Private
exports.getMyTeam = async (req, res, next) => {
  try {
    const userTeams = await TeamService.findByUserId(req.user.id);

    if (!userTeams || userTeams.length === 0) {
      return res.status(200).json({
        success: true,
        data: null,
      });
    }

    // Get the full team with member details
    const fullTeam = await TeamService.findById(userTeams[0].id);

    if (!fullTeam) {
      return res.status(200).json({
        success: true,
        data: null,
      });
    }

    fullTeam.isLeader = userTeams[0].isLeader;

    res.status(200).json({
      success: true,
      data: fullTeam,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete team
// @route   DELETE /api/teams/:id
// @access  Private/Admin
exports.deleteTeam = async (req, res, next) => {
  try {
    const existing = await TeamService.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    await TeamService.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};
