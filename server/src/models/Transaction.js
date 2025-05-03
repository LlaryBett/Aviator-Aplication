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
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add method to create user transaction
transactionSchema.statics.createUserTransaction = async function(userId, type, amount) {
  const transaction = new this({
    userId,
    type,
    amount,
    status: 'completed'
  });
  await transaction.save();
  return transaction;
};

module.exports = mongoose.model('Transaction', transactionSchema);
