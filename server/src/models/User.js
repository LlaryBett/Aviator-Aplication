const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');  // Change to bcryptjs

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, sparse: true, unique: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  balance: { 
    type: Number,
    default: 0,
    required: true
  },
  avatar: {
    type: String,
    default: 'https://api.dicebear.com/7.x/avataaars/svg'
  }
}, { timestamps: true });

// Ensure phone OR email is provided
userSchema.pre('save', function(next) {
  if (!this.phone && !this.email) {
    next(new Error('Either phone or email is required'));
  }
  next();
});

// Pre-save middleware to hash password
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

// Login method
userSchema.statics.findByCredentials = async (identifier, password) => {
  const user = await User.findOne({
    $or: [{ email: identifier }, { phone: identifier }]
  });
  if (!user) throw new Error('Invalid login credentials');
  
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error('Invalid login credentials');
  
  return user;
};

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Add method to update balance
userSchema.methods.updateBalance = async function(amount, type) {
  this.balance = type === 'debit' ? this.balance - amount : this.balance + amount;
  this.lastTransactionAt = new Date();
  await this.save();
  return this.balance;
};

module.exports = mongoose.model('User', userSchema);
