const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

class TransactionService {
  static async createTransaction(userId, type, amount) {
    console.log('🔵 Creating transaction:', {
      userId: userId.toString(),
      type,
      amount
    });

    const transaction = await Transaction.createTransaction(userId, type, amount);
    console.log('✅ Transaction created:', {
      transactionId: transaction._id.toString(),
      userId: transaction.userId.toString(),
      type,
      amount
    });
    return transaction;
  }

  static async getUserTransactions(userId) {
    console.log(`🔍 Fetching transactions for user: ${userId}`);
    const transactions = await Transaction.find({ userId }).sort({ createdAt: -1 });
    console.log(`Found ${transactions.length} transactions:`, 
      transactions.map(t => ({
        id: t._id,
        userId: t.userId,
        type: t.type,
        amount: t.amount,
        status: t.status
      }))
    );
    return transactions;
  }

  static async calculateUserBalance(userId) {
    console.log(`💰 Calculating balance for user: ${userId}`);
    const transactions = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$userId',
          balance: {
            $sum: {
              $cond: [
                { $in: ['$type', ['deposit', 'win']] },
                '$amount',
                { $multiply: ['$amount', -1] }
              ]
            }
          }
        }
      }
    ]);

    const balance = transactions.length > 0 ? transactions[0].balance : 0;
    console.log(`Balance result for ${userId}:`, balance);
    return balance;
  }
}

module.exports = TransactionService;
