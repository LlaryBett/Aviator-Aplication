const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  crashPoint: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  players: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    betAmount: Number,
    cashoutMultiplier: Number,
    winAmount: Number
  }]
});

module.exports = mongoose.model('Game', gameSchema);
