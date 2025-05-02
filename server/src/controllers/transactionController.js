const User = require('../models/User');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

const deposit = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount } = req.body;
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const userId = req.user._id;
    const user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'User not found' });
    }

    const balanceBefore = Number(user.balance || 0);
    const balanceAfter = balanceBefore + Number(amount);
    
    const transaction = new Transaction({
      userId,
      type: 'deposit',
      amount: Number(amount),
      balanceBefore,
      balanceAfter,
      status: 'completed'
    });

    await transaction.save({ session });
    
    user.balance = balanceAfter;
    await user.save({ session });
    
    await session.commitTransaction();
    
    res.json({ 
      success: true,
      balance: balanceAfter,
      transaction: transaction._id
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Deposit error:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.errors || {} 
    });
  } finally {
    session.endSession();
  }
};

module.exports = {
  deposit
};