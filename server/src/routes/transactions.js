const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');
const User = require('../models/User');
const mongoose = require('mongoose');
const { initiateDeposit, handleCallback, getTransactionStatus, initiateWithdraw, handleB2CCallback } = require('../controllers/mpesaController');
const { initiateB2C } = require('../utils/mpesa');
console.log('M-Pesa controller loaded:', { initiateDeposit, handleCallback });

console.log('[transactions.js] Loaded and routes registered');
console.log('[transactions.js] Route file loaded'); // Add this at the top

const handleWebSocketMessage = (ws, data) => {
    if (data.type === 'user_connected') {
        if (!data.user?.id) {
            console.error('Invalid user data:', data);
            return;
        }
        
        ws.userId = data.user.id;
        console.log('User connected:', data.user.username);
        // No need to add player here since that's handled elsewhere
    }
};

const broadcastBalance = (userId, newBalance, wss) => {
    if (!wss) return;
    
    wss.clients.forEach(client => {
        if (client.readyState === 1 && client.userId === userId) {
            client.send(JSON.stringify({
                type: 'balance_update',
                userId,
                newBalance
            }));
        }
    });
};

const verifyAndLogUser = async (userId) => {
    console.log('🔍 Verifying transaction for user:', userId);
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }
    console.log('✅ Verified user:', {
        userId: user._id,
        username: user.username,
        phone: user.phone
    });
    return user;
};

const calculateBalance = async (userId) => {
    const result = await Transaction.aggregate([
        {
            $match: {
                userId: new mongoose.Types.ObjectId(userId),
                $or: [
                    { status: 'completed' },
                    { $and: [{ type: 'deposit' }, { status: 'pending' }] }
                ]
            }
        },
        {
            $group: {
                _id: null,
                total: {
                    $sum: {
                        $cond: {
                            if: { $eq: ['$type', 'bet'] },
                            then: { $multiply: ['$amount', -1] },
                            else: '$amount'
                        }
                    }
                }
            }
        }
    ]);
    return result.length > 0 ? result[0].total : 0;
};

router.post('/deposit', auth, async (req, res) => {
    try {
        const { amount } = req.body;
        console.log('💰 Creating deposit:', { userId: req.user._id, amount });
        
        const transaction = new Transaction({
            userId: req.user._id,
            type: 'deposit',
            amount,
            status: 'pending'
        });

        await transaction.save();
        console.log('✅ Deposit created:', {
            transactionId: transaction._id,
            userId: transaction.userId,
            amount: transaction.amount
        });

        // Fetch updated balance
        const updatedBalance = await calculateBalance(req.user._id);
        console.log('Updated balance:', updatedBalance);

        res.status(201).json({
            success: true,
            transaction,
            balance: updatedBalance
        });
    } catch (error) {
        console.error('Deposit error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/balance', auth, async (req, res) => {
    try {
        const currentUserId = req.user._id;
        // console.log('🔍 Calculating balance for user:', currentUserId);

        // First log all user's transactions
        const allTransactions = await Transaction.find({ userId: currentUserId });
       

        const balanceAggregation = await Transaction.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(currentUserId),
                    $or: [
                        { status: 'completed' },
                        { $and: [{ type: 'deposit' }, { status: 'pending' }] }
                    ]
                }
            },
            {
                $group: {
                    _id: null,
                    total: {
                        $sum: {
                            $cond: {
                                if: { $eq: ['$type', 'bet'] },
                                then: { $multiply: ['$amount', -1] },
                                else: '$amount'
                            }
                        }
                    }
                }
            }
        ]);

        const balance = balanceAggregation.length > 0 ? balanceAggregation[0].total : 0;
        // console.log('💰 Balance calculation result:', {
        //     userId: currentUserId,
        //     balance,
        //     transactionCount: allTransactions.length
        // });

        // Update user's balance in database
        await User.findByIdAndUpdate(currentUserId, { balance });

        res.json({ 
            balance,
            transactionCount: allTransactions.length
        });
    } catch (error) {
        console.error('Balance calculation error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/history', auth, async (req, res) => {
    try {
        const transactions = await Transaction.find({ 
            userId: req.user._id 
        }).sort({ createdAt: -1 });
        
        res.json({ transactions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/bet', auth, async (req, res) => {
    console.log('[transactions.js] /bet route hit'); // Add this at the start of the route

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { amount } = req.body;
        console.log('[Backend] Received bet request:', {
            userId: req.user._id,
            amount
        });

        // Find user and validate balance atomically
        const user = await User.findById(req.user._id).session(session);
        console.log('[Backend] User before deduction:', {
            userId: user?._id,
            balance: user?.balance
        });

        if (!user || user.balance < amount) {
            throw new Error('Insufficient balance');
        }

        // Update balance atomically
        const updatedUser = await User.findOneAndUpdate(
            { _id: user._id, balance: { $gte: amount } },
            { $inc: { balance: -amount } },
            { new: true, session }
        );

        console.log('[Backend] User after deduction:', {
            userId: updatedUser?._id,
            balance: updatedUser?.balance
        });

        if (!updatedUser) {
            throw new Error('Balance update failed');
        }

        // Create transaction
        const transaction = new Transaction({
            userId: user._id,
            type: 'bet',
            amount,
            status: 'completed',
            balanceAfter: updatedUser.balance
        });

        await transaction.save({ session });
        await session.commitTransaction();

        console.log('[Backend] Bet transaction saved:', {
            transactionId: transaction._id,
            userId: user._id,
            amount,
            balanceAfter: updatedUser.balance
        });

        res.json({
            success: true,
            betId: transaction._id,
            newBalance: updatedUser.balance
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('[Backend] Bet error:', error);
        res.status(400).json({ error: error.message });
    } finally {
        session.endSession();
    }
});

router.post('/win', auth, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { betId, winAmount, multiplier } = req.body;
        console.log('[Backend] /win called:', { betId, winAmount, multiplier });

        if (!betId || typeof winAmount !== 'number' || typeof multiplier !== 'number') {
            throw new Error('Missing or invalid parameters');
        }

        const user = await verifyAndLogUser(req.user._id);
        console.log('🏆 Processing win for user:', user._id);

        // Find the bet transaction (already completed for balance)
        const bet = await Transaction.findOne({
            _id: betId,
            userId: user._id,
            type: 'bet'
        }).session(session);

        if (!bet) {
            throw new Error('No bet found');
        }

        // Update user's balance with winnings
        user.balance += winAmount;
        await user.save({ session });

        // Record win transaction
        const winTransaction = new Transaction({
            userId: user._id,
            type: 'win',
            amount: winAmount,
            status: 'completed',
            balanceAfter: user.balance,
            relatedBetId: betId,
            phoneNumber: user.phone
        });

        console.log('📝 Creating win transaction:', {
            userId: user._id,
            betId,
            winAmount
        });

        await winTransaction.save({ session });
        
        await session.commitTransaction();
        broadcastBalance(user._id, user.balance, req.app.get('wss'));

        // After successful win, broadcast updated leaderboard
        const wss = req.app.get('wss');
        if (wss) {
            wss.clients.forEach(client => {
                if (client.readyState === 1) {
                    client.send(JSON.stringify({
                        type: 'leaderboard_update'
                    }));
                }
            });
        }

        res.json({ 
            success: true,
            newBalance: user.balance
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('[Backend] Win error:', error);
        res.status(400).json({ error: error.message });
    } finally {
        session.endSession();
    }
});

router.post('/bet/lost', auth, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const user = await verifyAndLogUser(req.user._id);
        console.log('❌ Processing bet loss for user:', user._id);

        const { betId } = req.body;

        // Find the bet transaction
        const bet = await Transaction.findOne({
            _id: betId,
            userId: user._id,
            type: 'bet'
        }).session(session);

        if (!bet) {
            throw new Error('No bet found');
        }

        await session.commitTransaction();

        // Get final balance
        broadcastBalance(user._id, user.balance, req.app.get('wss'));

        res.json({ 
            success: true,
            newBalance: user.balance
        });
    } catch (error) {
        await session.abortTransaction();
        res.status(400).json({ error: error.message });
    } finally {
        session.endSession();
    }
});

router.get('/leaderboard', async (req, res) => {
    try {
        console.log('📊 Fetching leaderboard data');
        
        const leaderboard = await Transaction.aggregate([
            {
                $match: {
                    type: 'win',
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: '$userId',
                    totalWinnings: { $sum: '$amount' },
                    winCount: { $sum: 1 },
                    highestWin: { $max: '$amount' }
                }
            },
            {
                $sort: { totalWinnings: -1 }
            },
            {
                $limit: 10
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $project: {
                    _id: 1,
                    username: { $arrayElemAt: ['$user.username', 0] },
                    totalWinnings: 1,
                    winCount: 1,
                    highestWin: 1
                }
            }
        ]);

        console.log('🏆 Leaderboard calculated:', 
            leaderboard.map(player => ({
                username: player.username,
                wins: player.winCount,
                total: player.totalWinnings
            }))
        );

        res.json(leaderboard);
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/withdraw', auth, initiateWithdraw);

// M-Pesa routes
router.post('/mpesa/stk', auth, initiateDeposit);
router.post('/mpesa/callback', handleCallback);
router.post('/mpesa/b2c-callback', handleB2CCallback);
router.get('/status/:requestId', auth, getTransactionStatus);

module.exports = router;