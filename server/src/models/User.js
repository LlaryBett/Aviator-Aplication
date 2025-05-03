const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  email: {
    type: String,
    sparse: true,  // Allows multiple null/empty values
    unique: true,
    trim: true,
    set: v => v === '' ? null : v, // Convert empty string to null
    default: null,
    match: [/^\S+@\S+$/, 'Invalid email format']
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^\d{10,15}$/, 'Invalid phone format']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  avatar: {
    type: String,
    default: 'https://api.dicebear.com/7.x/avataaars/svg'
  }
}, { 
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },    // Enable virtuals when converting to JSON
  toObject: { virtuals: true }  // Enable virtuals when converting to objects
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
