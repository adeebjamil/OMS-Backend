const Evaluation = require('../models/Evaluation');
const { createNotification } = require('./notificationController');

// @desc    Get all evaluations
// @route   GET /api/evaluations
// @access  Private
exports.getEvaluations = async (req, res, next) => {
  try {
    const { internId, evaluationType, isPublished } = req.query;
    let query = {};

    // If user is employee, only show their own evaluations
    if (req.user.role === 'intern') {
      query.internId = req.user.id;
      query.isPublished = true;
    } else {
      if (internId) query.internId = internId;
      if (isPublished !== undefined) query.isPublished = isPublished;
    }

    if (evaluationType) query.evaluationType = evaluationType;

    const evaluations = await Evaluation.find(query)
      .populate('internId', 'name email')
      .populate('evaluatedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: evaluations.length,
      data: evaluations
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single evaluation
// @route   GET /api/evaluations/:id
// @access  Private
exports.getEvaluation = async (req, res, next) => {
  try {
    const evaluation = await Evaluation.findById(req.params.id)
      .populate('internId', 'name email')
      .populate('evaluatedBy', 'name email');

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    res.status(200).json({
      success: true,
      data: evaluation
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create evaluation
// @route   POST /api/evaluations
// @access  Private/Admin
exports.createEvaluation = async (req, res, next) => {
  try {
    req.body.evaluatedBy = req.user.id;

    const evaluation = await Evaluation.create(req.body);
    
    // Populate to get employee details
    await evaluation.populate('internId', 'name email');

    // Create notification for the employee (only if published)
    if (evaluation.isPublished && evaluation.internId && evaluation.internId._id) {
      try {
        await createNotification({
          userId: evaluation.internId._id,
          type: 'evaluation_created',
          title: 'New Evaluation Available',
          message: `You have received a new ${evaluation.evaluationType} evaluation`,
          relatedId: evaluation._id,
          relatedModel: 'Evaluation',
          link: `/dashboard/evaluations`,
          priority: 'normal',
          createdBy: req.user.id
        });
        console.log('✅ Evaluation notification created');
      } catch (notifError) {
        console.error('❌ Error creating evaluation notification:', notifError);
      }
    }

    res.status(201).json({
      success: true,
      data: evaluation
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update evaluation
// @route   PUT /api/evaluations/:id
// @access  Private/Admin
exports.updateEvaluation = async (req, res, next) => {
  try {
    const evaluation = await Evaluation.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    res.status(200).json({
      success: true,
      data: evaluation
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete evaluation
// @route   DELETE /api/evaluations/:id
// @access  Private/Admin
exports.deleteEvaluation = async (req, res, next) => {
  try {
    const evaluation = await Evaluation.findByIdAndDelete(req.params.id);

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Publish evaluation
// @route   PUT /api/evaluations/:id/publish
// @access  Private/Admin
exports.publishEvaluation = async (req, res, next) => {
  try {
    const evaluation = await Evaluation.findById(req.params.id);

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    evaluation.isPublished = true;
    await evaluation.save();

    res.status(200).json({
      success: true,
      data: evaluation
    });
  } catch (error) {
    next(error);
  }
};
