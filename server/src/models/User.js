const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

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

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
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

// Password comparison method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
