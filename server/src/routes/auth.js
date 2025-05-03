const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

// Helper function to calculate balance
const calculateBalance = async (userId) => {
  const transactions = await Transaction.aggregate([
    { $match: { 
      userId: userId,
      status: 'completed'
    }},
    { $group: {
      _id: null,
      total: {
        $sum: {
          $cond: [
            { $in: ['$type', ['deposit', 'win']] },
            '$amount',
            { $multiply: ['$amount', -1] }  // for bets and withdrawals
          ]
        }
      }
    }}
  ]);
  return transactions.length > 0 ? transactions[0].total : 0;
};

// Register
router.post('/register', async (req, res) => {
  console.log('Registration attempt:', req.body);
  try {
    // Check if user exists
    const existingUser = await User.findOne({
      $or: [
        { email: req.body.email },
        { phone: req.body.phone },
        { username: req.body.username }
      ]
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: 'User already exists with this email, phone, or username' 
      });
    }

    const user = new User(req.body);
    await user.save();

    // Return the new user object (without password) and optionally a token if you want auto-login
    res.status(201).json({ 
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        phone: req.body.phone,
        balance: 0,
        avatar: user.avatar
      },
      // Optionally, generate a token here if you want to auto-login after register:
      // const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET)
      success: true,
      message: 'Registration successful! Please login.'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const user = await User.findOne({
      $or: [{ email: req.body.email }, { phone: req.body.phone }]
    });

    if (!user || !(await user.comparePassword(req.body.password))) {
      throw new Error('Invalid credentials');
    }

    // Calculate current balance
    const balance = await calculateBalance(user._id);

    console.log('Login Debug - Secret:', process.env.JWT_SECRET ? 'Secret exists' : 'NO SECRET!');
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET || 'aviatorsecret'
    );

    // Always return a fresh user object and token
    res.json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        balance: balance,
        avatar: user.avatar
      },
      token
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(401).json({ error: error.message });
  }
});

// Logout (stateless for JWT)
router.post('/logout', (req, res) => {
  res.status(200).json({ message: 'Logged out successfully' });
});

// Verify
router.get('/verify', auth, async (req, res) => {
  try {
    const balance = await calculateBalance(req.user._id);
    res.json({
      user: {
        _id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        phone: req.user.phone,
        balance: balance,
        avatar: req.user.avatar
      }
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

module.exports = router;
