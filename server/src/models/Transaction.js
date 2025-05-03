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
  },
  balanceAfter: Number,
  phoneNumber: String
}, { 
  timestamps: true,
  strict: true
});

// Add pre-save middleware to validate userId
transactionSchema.pre('save', async function(next) {
  if (this.isNew) {
    console.log('🔍 Validating transaction user:', this.userId);
    const User = mongoose.model('User');
    const user = await User.findById(this.userId);
    
    if (!user) {
      console.error('❌ Invalid userId:', this.userId);
      throw new Error('Invalid userId for transaction');
    }
    
    console.log('✅ Valid user found for transaction:', {
      userId: user._id,
      username: user.username
    });
  }
  next();
});

// Add index for faster queries
transactionSchema.index({ userId: 1, status: 1, type: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
