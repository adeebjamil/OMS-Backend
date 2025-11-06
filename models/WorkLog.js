const mongoose = require('mongoose');

const workLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  title: {
    type: String,
    required: [true, 'Please provide a title'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please provide a description']
  },
  tasksCompleted: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  hoursWorked: {
    type: Number,
    default: 0
  },
  challenges: {
    type: String,
    default: ''
  },
  learnings: {
    type: String,
    default: ''
  },
  nextDayPlan: {
    type: String,
    default: ''
  },
  attachments: [{
    name: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: ['submitted', 'reviewed', 'approved'],
    default: 'submitted'
  },
  feedback: {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    comment: String,
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    reviewedAt: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
workLogSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('WorkLog', workLogSchema);
