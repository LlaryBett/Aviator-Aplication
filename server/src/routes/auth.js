const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');
const TransactionService = require('../services/transactionService');

// Helper function to calculate balance
const calculateBalance = async (userId) => {
  const transactions = await Transaction.aggregate([
    { 
      $match: { 
        userId: new mongoose.Types.ObjectId(userId), // Only this user's transactions
        status: 'completed'
      }
    },
    { 
      $group: {
        _id: null,
        total: {
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
  return transactions.length > 0 ? transactions[0].total : 0;
};

// Register a new user
router.post('/register', async (req, res) => {
  console.log('Registration attempt:', req.body);
  try {
    // Normalize email field
    const normalizedData = {
      ...req.body,
      email: req.body.email || null // Convert empty string to null
    };

    // Check for existing user
    const query = {
      $or: [
        { phone: normalizedData.phone },
        { username: normalizedData.username }
      ]
    };
    
    // Only check email if it's not null
    if (normalizedData.email) {
      query.$or.push({ email: normalizedData.email });
    }

    const existingUser = await User.findOne(query);

    if (existingUser) {
      let conflictField = '';
      if (existingUser.email === normalizedData.email && normalizedData.email) conflictField = 'email';
      if (existingUser.phone === normalizedData.phone) conflictField = 'phone';
      if (existingUser.username === normalizedData.username) conflictField = 'username';

      console.log(`Registration failed: User exists with ${conflictField}`);
      return res.status(400).json({ 
        error: `User already exists with this ${conflictField}` 
      });
    }

    const user = new User(normalizedData);
    console.log('New user object created:', user);

    await user.save();
    console.log('New user registered with ID:', user._id, 'Initial balance:', user.balance);

    // Return the new user object (without password) and optionally a token if you want auto-login
    res.status(201).json({ 
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        phone: normalizedData.phone,
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
    console.error('Registration error details:', error.message, error.stack);
    res.status(400).json({ error: error.message });
  }
});

// Login an existing user
router.post('/login', async (req, res) => {
  try {
    const { email, password, phone } = req.body;
    console.log('👤 Login attempt:', { email, phone });

    let query = {};
    if (email) {
      query = { email };
    } else if (phone) {
      query = { phone };
    } else {
      return res.status(400).json({ error: 'Email or phone is required' });
    }

    const user = await User.findOne(query).select('+password'); // Include password

    if (!user) {
      console.log('❌ Login failed: User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('✅ Found user:', {
      userId: user._id.toString(),
      username: user.username,
      phone: user.phone
    });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('Login failed: Incorrect password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user's transactions and balance
    const transactions = await TransactionService.getUserTransactions(user._id);
    const balance = await TransactionService.calculateUserBalance(user._id);

    console.log('👤 User login details:', {
      userId: user._id,
      username: user.username,
      transactionCount: transactions.length,
      calculatedBalance: balance
    });

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

// Logout (invalidate token) - requires auth middleware
router.post('/logout', auth, async (req, res) => {
  // Invalidate token (if using token blacklist)
  res.status(200).json({ message: 'Logged out successfully' });
});

// Get user data (requires authentication)
router.get('/me', auth, async (req, res) => {
  try {
    // User is already attached to the request by auth middleware
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
