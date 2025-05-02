const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');  // Change to bcryptjs

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  balance: { type: Number, required: true, default: 0 },
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date,
  stats: {
    totalWinnings: { type: Number, default: 0 },
    biggestWin: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
    lastGamePlayed: Date
  },
  avatar: { type: String, default: function() {
    return `https://i.pravatar.cc/150?u=${this._id}`;
  }},
  email: { type: String, sparse: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  tokens: [{
    token: { type: String, required: true }
  }]
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

module.exports = mongoose.model('User', userSchema);
