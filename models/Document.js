const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a document title'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['training', 'policy', 'project', 'form', 'certificate', 'other'],
    default: 'other'
  },
  fileUrl: {
    type: String,
    required: [true, 'Please provide file URL']
  },
  fileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number // in bytes
  },
  fileType: {
    type: String // pdf, docx, xlsx, etc.
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sharedWith: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    accessLevel: {
      type: String,
      enum: ['view', 'download', 'edit'],
      default: 'view'
    }
  }],
  isPublic: {
    type: Boolean,
    default: false // If true, all employees can access
  },
  tags: [String],
  downloads: {
    type: Number,
    default: 0
  },
  expiryDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for faster queries
documentSchema.index({ category: 1, isPublic: 1 });
documentSchema.index({ uploadedBy: 1 });

module.exports = mongoose.model('Document', documentSchema);
