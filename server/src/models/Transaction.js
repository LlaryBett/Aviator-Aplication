const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdraw', 'bet', 'win'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  }
}, { 
  timestamps: true 
});

// Index for faster queries
transactionSchema.index({ userId: 1, status: 1 });

// Middleware to update user balance
transactionSchema.post('save', async function() {
  if (this.status === 'completed') {
    const User = mongoose.model('User');
    const user = await User.findById(this.userId);
    if (user) {
      const modifier = ['deposit', 'win'].includes(this.type) ? 1 : -1;
      user.balance += (this.amount * modifier);
      await user.save();
    }
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);
