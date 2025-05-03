const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

// Register a new user
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
      console.log('Registration failed: User already exists');
      return res.status(400).json({ 
        error: 'User already exists with this email, phone, or username' 
      });
    }

    const user = new User(req.body);
    console.log('New user object created:', user);

    await user.save();
    console.log('New user registered with ID:', user._id, 'Initial balance:', user.balance);

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
    console.error('Registration error details:', error.message, error.stack);
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

    // Add this line to check if JWT_SECRET is defined
    console.log("JWT_SECRET from env:", process.env.JWT_SECRET);

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
