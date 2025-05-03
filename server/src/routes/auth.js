const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ 
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        balance: user.balance,
        avatar: user.avatar
      },
      token,
      message: 'User registered successfully'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login an existing user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password'); // Include password
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ 
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        balance: user.balance,
        avatar: user.avatar
      },
      token 
    });
  } catch (error) {
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
