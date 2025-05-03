const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Invalid token format');
    }

    console.log('JWT Debug - Secret:', process.env.JWT_SECRET ? 'Secret exists' : 'NO SECRET!');
    const token = authHeader.replace('Bearer ', '');
    console.log('🔑 Verifying token:', token);

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'aviatorsecret');
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
    console.error('Auth Error Details:', {
      message: error.message,
      secret: process.env.JWT_SECRET ? 'Secret exists' : 'NO SECRET!'
    });
    res.status(401).json({ error: 'Please authenticate.' });
  }
};

module.exports = auth;
