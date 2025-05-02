const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Invalid token format');
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🔑 Verifying token:', token);

    const decoded = jwt.verify(token, 'your_jwt_secret');
    console.log('👤 Decoded user ID:', decoded.userId);

    const user = await User.findById(decoded.userId)
      .select('username email phone balance avatar');
    
    if (!user) {
      console.log('❌ No user found with ID:', decoded.userId);
      throw new Error('User not found');
    }

    // Log user details
    console.log('✅ Found user:', {
      username: user.username,
      phone: user.phone,
      email: user.email,
      balance: user.balance
    });

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('🚫 Auth error:', error.message);
    res.status(401).json({ error: 'Please authenticate.' });
  }
};

module.exports = auth;
