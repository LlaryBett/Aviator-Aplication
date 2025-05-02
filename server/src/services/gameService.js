const crypto = require('crypto');
const Game = require('../models/Game');

class GameService {
  constructor() {
    this.currentGame = null;
    this.currentMultiplier = 1.0;
    this.isGameActive = false;
    this.gamePhase = 'waiting';
    this.connectedClients = new Set();
    this.TICK_RATE = 50;
    this.MULTIPLIER_INCREASE_RATE = 0.01;
    this.activeBets = new Map();
    this.chatMessages = [];
    this.leaderboard = [];
    this.livePlayers = new Map();
    this.minCrash = 1.00;
    this.maxCrash = 100.00;
  }

  async fetchLeaderboard() {
    const leaderboard = await Game.aggregate([
      { $unwind: '$players' },
      {
        $group: {
          _id: '$players.userId',
          totalWinnings: { $sum: '$players.winAmount' },
          biggestWin: { $max: '$players.winAmount' },
          gamesPlayed: { $sum: 1 },
          username: { $first: '$players.username' },
          avatar: { $first: '$players.avatar' }
        }
      },
      { $sort: { totalWinnings: -1 } },
      { $limit: 10 }
    ]);

    this.leaderboard = leaderboard;
    return leaderboard;
  }

  broadcastGameState() {
    const gameState = {
      currentMultiplier: this.currentMultiplier,
      gamePhase: this.gamePhase,
      players: this.currentGame?.players || [],
      leaderboard: this.leaderboard
    };

    this.connectedClients.forEach(client => {
      if (client.readyState === 1) { // Check if client is open
        client.send(JSON.stringify({
          type: 'game_update',
          data: gameState
        }));
      }
    });
  }

  async updateGameState() {
    const gameState = {
      currentMultiplier: this.currentMultiplier,
      gamePhase: this.gamePhase,
      players: Array.from(this.activeBets.values()),
      chatMessages: this.chatMessages,
      leaderboard: await this.updateLeaderboard()
    };

    this.broadcastToAll('game_state', gameState);
  }

  async handleBet(userId, amount, autoCashout) {
    this.activeBets.set(userId, {
      userId,
      amount,
      autoCashout,
      placedAt: Date.now()
    });
    await this.updateGameState();
  }

  async handleChatMessage(userId, message) {
    this.chatMessages.push({
      id: Date.now().toString(),
      userId,
      message,
      timestamp: Date.now()
    });
    this.broadcastToAll('chat_update', { messages: this.chatMessages });
  }

  async updateLeaderboard() {
    const topWinners = await Game.aggregate([
      { $unwind: '$players' },
      { $group: {
        _id: '$players.userId',
        totalWinnings: { $sum: '$players.winAmount' }
      }},
      { $sort: { totalWinnings: -1 } },
      { $limit: 10 }
    ]);
    return topWinners;
  }

  async startGame() {
    this.currentMultiplier = 1.0;
    this.isGameActive = true;
    this.gamePhase = 'flying';
    
    const crashPoint = this.calculateNextCrashPoint();
    this.currentGame = await Game.create({
      crashPoint,
      status: 'running'
    });

    await this.fetchLeaderboard(); // Update leaderboard at start of each game
    this.broadcastGameState();

    this.gameLoop = setInterval(() => {
      if (this.isGameActive) {
        this.currentMultiplier += (this.currentMultiplier * this.MULTIPLIER_INCREASE_RATE);
        
        if (this.currentMultiplier >= crashPoint) {
          this.crashGame();
        }
        
        this.broadcastGameState();
      }
    }, this.TICK_RATE);
  }

  async crashGame() {
    this.isGameActive = false;
    this.gamePhase = 'crashed';
    clearInterval(this.gameLoop);
    
    await Game.findByIdAndUpdate(this.currentGame._id, {
      status: 'completed',
      finalMultiplier: this.currentMultiplier
    });

    await this.fetchLeaderboard(); // Update leaderboard after game ends
    this.broadcastGameState();

    setTimeout(() => {
      this.gamePhase = 'waiting';
      setTimeout(() => this.startGame(), 3000);
    }, 2000);

    this.broadcastGameState();
  }

  calculateNextCrashPoint() {
    const e = Math.pow(2, 32);
    const r = crypto.randomBytes(4).readUInt32BE(0) / e;
    
    // House edge of 1%
    const houseEdge = 0.99;
    
    // Calculate crash point using exponential distribution
    const crashPoint = Math.max(
      this.minCrash,
      Math.floor(100 * (1 / (1 - r * houseEdge))) / 100
    );

    console.log('🎲 Next crash point:', crashPoint);
    return crashPoint;
  }

  addPlayer(playerId, playerData) {
    this.livePlayers.set(playerId, {
      id: playerId,
      username: playerData.username,
      avatar: playerData.avatar,
      lastActive: Date.now(),
      ...playerData
    });
    this.broadcastPlayerUpdate();
  }

  removePlayer(playerId) {
    this.livePlayers.delete(playerId);
    this.broadcastPlayerUpdate();
  }

  updatePlayerBet(playerId, betAmount) {
    const player = this.livePlayers.get(playerId);
    if (player) {
      player.betAmount = betAmount;
      player.lastActive = Date.now();
      this.broadcastPlayerUpdate();
    }
  }

  broadcastPlayerUpdate() {
    const players = Array.from(this.livePlayers.values())
      .filter(player => Date.now() - player.lastActive < 5 * 60 * 1000); // Show players active in last 5 minutes

    this.connectedClients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({
          type: 'live_players_update',
          players
        }));
      }
    });
  }
}

module.exports = new GameService();
