const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema({
  internId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  evaluatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  evaluationType: {
    type: String,
    enum: ['weekly', 'monthly', 'final'],
    required: true
  },
  period: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  
  // Performance Metrics
  ratings: {
    technicalSkills: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    communication: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    teamwork: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    punctuality: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    problemSolving: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    initiative: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    learningAbility: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    }
  },
  
  overallRating: {
    type: Number,
    min: 1,
    max: 5
  },
  
  strengths: {
    type: String,
    required: true
  },
  areasOfImprovement: {
    type: String,
    required: true
  },
  achievements: {
    type: String
  },
  recommendations: {
    type: String
  },
  
  // Statistics
  stats: {
    tasksCompleted: { type: Number, default: 0 },
    tasksAssigned: { type: Number, default: 0 },
    attendancePercentage: { type: Number, default: 0 },
    averageHoursPerDay: { type: Number, default: 0 }
  },
  
  certificateGenerated: {
    type: Boolean,
    default: false
  },
  certificateUrl: {
    type: String,
    default: null
  },
  
  isPublished: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Calculate overall rating before saving
evaluationSchema.pre('save', function(next) {
  if (this.ratings) {
    const ratings = Object.values(this.ratings);
    const sum = ratings.reduce((acc, val) => acc + val, 0);
    this.overallRating = Math.round((sum / ratings.length) * 10) / 10;
  }
  next();
});

// Index for faster queries
evaluationSchema.index({ internId: 1, evaluationType: 1, createdAt: -1 });

module.exports = mongoose.model('Evaluation', evaluationSchema);
