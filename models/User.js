const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'intern'],
    default: 'intern'
  },
  phone: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  
  // Unique Intern ID (auto-generated for interns)
  internId: {
    type: String,
    unique: true,
    sparse: true, // Only unique for non-null values
    trim: true
  },
  
  // Intern-specific fields
  college: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  internshipRole: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'completed'],
    default: 'active'
  },
  supervisorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Additional info
  address: String,
  emergencyContact: {
    name: String,
    phone: String,
    relation: String
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Clean phone number format before saving
userSchema.pre('save', function(next) {
  // Remove +, spaces, hyphens, parentheses from phone number
  if (this.phone && this.isModified('phone')) {
    this.phone = this.phone.replace(/[\+\s\-\(\)]/g, '');
    console.log(`📱 Cleaned phone number for ${this.email}: ${this.phone}`);
  }
  next();
});

// Generate unique Intern ID before saving
userSchema.pre('save', async function(next) {
  // Generate internId only for new intern users
  if (this.isNew && this.role === 'intern' && !this.internId) {
    try {
      // Get current year
      const year = new Date().getFullYear().toString().slice(-2);
      
      // Find the last intern created this year
      const lastIntern = await mongoose.model('User').findOne({
        role: 'intern',
        internId: { $regex: `^INT${year}` }
      }).sort({ internId: -1 });

      let sequence = 1;
      if (lastIntern && lastIntern.internId) {
        // Extract sequence number from last intern ID
        const lastSequence = parseInt(lastIntern.internId.slice(-4));
        sequence = lastSequence + 1;
      }

      // Format: INT + YY + 0001 (e.g., INT25-0001)
      this.internId = `INT${year}-${sequence.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating intern ID:', error);
      return next(error);
    }
  }
  
  next();
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
userSchema.methods.generateToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

module.exports = mongoose.model('User', userSchema);
