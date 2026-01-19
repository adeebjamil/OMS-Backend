const EvaluationService = require('../services/EvaluationService');
const { createNotification } = require('./notificationController');

// @desc    Get all evaluations
// @route   GET /api/evaluations
// @access  Private
exports.getEvaluations = async (req, res, next) => {
  try {
    const { internId, evaluationType, isPublished } = req.query;
    const filters = {};

    // If user is employee, only show their own evaluations
    if (req.user.role === 'intern') {
      filters.internId = req.user.id;
      filters.isPublished = true;
    } else {
      if (internId) filters.internId = internId;
      if (isPublished !== undefined) filters.isPublished = isPublished === 'true';
    }

    if (evaluationType) filters.evaluationType = evaluationType;

    const evaluations = await EvaluationService.find(filters);

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
    const evaluation = await EvaluationService.findById(req.params.id);

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

    const evaluation = await EvaluationService.create(req.body);
    
    // Get full evaluation with populated data
    const fullEvaluation = await EvaluationService.findById(evaluation.id);

    // Create notification for the employee (only if published)
    const internId = fullEvaluation.internId?.id || fullEvaluation.internId;
    if (fullEvaluation.isPublished && internId) {
      try {
        await createNotification({
          userId: internId,
          type: 'evaluation_created',
          title: 'New Evaluation Available',
          message: `You have received a new ${fullEvaluation.evaluationType} evaluation`,
          relatedId: fullEvaluation.id,
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
      data: fullEvaluation
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
    const evaluation = await EvaluationService.findByIdAndUpdate(req.params.id, req.body);

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
    const evaluation = await EvaluationService.findByIdAndDelete(req.params.id);

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
    const evaluation = await EvaluationService.findById(req.params.id);

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    evaluation.isPublished = true;
    const updated = await EvaluationService.save(evaluation);

    // Create notification
    const internId = updated.internId?.id || updated.internId;
    if (internId) {
      try {
        await createNotification({
          userId: internId,
          type: 'evaluation_created',
          title: 'Evaluation Published',
          message: `Your ${updated.evaluationType} evaluation has been published`,
          relatedId: updated.id,
          relatedModel: 'Evaluation',
          link: `/dashboard/evaluations`,
          priority: 'normal',
          createdBy: req.user.id
        });
      } catch (notifError) {
        console.error('❌ Error creating evaluation notification:', notifError);
      }
    }

    res.status(200).json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};
