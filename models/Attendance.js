const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  checkIn: {
    type: Date,
    required: true
  },
  checkOut: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'half-day', 'leave'],
    default: 'present'
  },
  leaveType: {
    type: String,
    enum: ['sick', 'casual', 'emergency', null],
    default: null
  },
  leaveReason: {
    type: String,
    default: null
  },
  leaveApproved: {
    type: Boolean,
    default: null
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  totalHours: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Calculate total hours before saving
attendanceSchema.pre('save', function(next) {
  if (this.checkIn && this.checkOut) {
    const hours = (this.checkOut - this.checkIn) / (1000 * 60 * 60);
    this.totalHours = Math.round(hours * 100) / 100;
  }
  next();
});

// Index for faster queries
attendanceSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
