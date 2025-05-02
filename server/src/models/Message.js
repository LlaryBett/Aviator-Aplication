const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  text: { type: String, required: true },
  username: { type: String, required: true },
  avatar: String,
  timestamp: { type: Number, default: Date.now },
  type: { type: String, default: 'user' } // 'system' or 'user'
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
