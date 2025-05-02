const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');
const User = require('../models/User');
const mongoose = require('mongoose');

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

router.post('/deposit', auth, async (req, res) => {
    try {
        const { amount, phoneNumber } = req.body;
        
        // Validate amount
        if (amount < 10 || amount > 100000) {
            return res.status(400).json({ 
                error: 'Amount must be between 10 and 100,000 KES' 
            });
        }

        // Get current balance
        const user = await User.findById(req.user._id);
        
        // Create transaction without balanceAfter for pending deposits
        const transaction = new Transaction({
            userId: req.user._id,
            type: 'deposit',
            amount,
            phoneNumber: phoneNumber || req.user.phone,
            status: 'pending',
            // balanceAfter will be set when deposit completes
        });

        await transaction.save();

        res.status(201).json({
            message: 'Deposit request created',
            transaction
        });

    } catch (error) {
        console.error('Deposit error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/balance', auth, async (req, res) => {
    try {
        console.log('Fetching balance for user:', {
            id: req.user._id,
            phone: req.user.phone
        });

        const transactions = await Transaction.aggregate([
            { 
                $match: { 
                    $or: [
                        { userId: req.user._id },
                        { phoneNumber: req.user.phone }
                    ],
                    // Include both completed and pending deposits
                    $or: [
                        { status: 'completed' },
                        { $and: [{ type: 'deposit' }, { status: 'pending' }] }
                    ]
                }
            },
            {
                $group: {
                    _id: null,
                    balance: {
                        $sum: {
                            $switch: {
                                branches: [
                                    { 
                                        case: { 
                                            $and: [
                                                { $eq: ['$type', 'deposit'] },
                                                { $in: ['$status', ['completed', 'pending']] }
                                            ]
                                        }, 
                                        then: '$amount' 
                                    },
                                    { 
                                        case: { 
                                            $and: [
                                                { $eq: ['$type', 'win'] },
                                                { $eq: ['$status', 'completed'] }
                                            ]
                                        }, 
                                        then: '$amount' 
                                    },
                                    { 
                                        case: { 
                                            $and: [
                                                { $eq: ['$type', 'bet'] },
                                                { $eq: ['$status', 'completed'] }
                                            ]
                                        }, 
                                        then: { $multiply: ['$amount', -1] }
                                    }
                                ],
                                default: 0
                            }
                        }
                    },
                    pendingDeposits: {
                        $sum: {
                            $cond: [
                                { $and: [
                                    { $eq: ['$type', 'deposit'] },
                                    { $eq: ['$status', 'pending'] }
                                ]},
                                '$amount',
                                0
                            ]
                        }
                    },
                    completedDeposits: {
                        $sum: {
                            $cond: [
                                { $and: [
                                    { $eq: ['$type', 'deposit'] },
                                    { $eq: ['$status', 'completed'] }
                                ]},
                                '$amount',
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        const balanceInfo = transactions[0] || { 
            balance: 0, 
            pendingDeposits: 0,
            completedDeposits: 0 
        };

        console.log('Detailed balance for', req.user.username, {
            ...balanceInfo,
            phone: req.user.phone
        });

        // Update user's balance
        await User.findByIdAndUpdate(req.user._id, { 
            balance: balanceInfo.balance 
        });

        res.json({
            balance: balanceInfo.balance,
            pending: balanceInfo.pendingDeposits,
            details: {
                deposits: balanceInfo.completedDeposits
            }
        });
    } catch (error) {
        console.error('Balance fetch error:', error);
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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { amount } = req.body;
        
        // Get current user balance
        const user = await User.findById(req.user._id).session(session);
        if (!user || user.balance < amount) {
            throw new Error('Insufficient balance');
        }

        // Deduct bet amount immediately
        const newBalance = user.balance - amount;
        user.balance = newBalance;
        await user.save({ session });

        // Create transaction with status 'completed'
        const transaction = new Transaction({
            userId: user._id,
            type: 'bet',
            amount,
            status: 'completed', // Always completed for balance calculation
            balanceAfter: newBalance,
            phoneNumber: user.phone
        });
        await transaction.save({ session });

        await session.commitTransaction();
        broadcastBalance(user._id, newBalance, req.app.get('wss'));

        res.json({ 
            success: true, 
            newBalance,
            betId: transaction._id 
        });
    } catch (error) {
        await session.abortTransaction();
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
        
        // Find the bet transaction (already completed for balance)
        const bet = await Transaction.findOne({
            _id: betId,
            userId: req.user._id,
            type: 'bet'
        }).session(session);

        if (!bet) {
            throw new Error('No bet found');
        }

        // Update user's balance with winnings
        const user = await User.findById(req.user._id).session(session);
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
        await winTransaction.save({ session });
        
        await session.commitTransaction();
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

router.post('/bet/lost', auth, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { betId } = req.body;

        // Find the bet transaction
        const bet = await Transaction.findOne({
            _id: betId,
            userId: req.user._id,
            type: 'bet'
        }).session(session);

        if (!bet) {
            throw new Error('No bet found');
        }

        // Do NOT change status, just annotate loss if you want
        // bet.isLost = true;
        // await bet.save({ session });

        await session.commitTransaction();

        // Get final balance
        const user = await User.findById(req.user._id);
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

module.exports = router;
