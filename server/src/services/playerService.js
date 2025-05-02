class PlayerService {
  constructor() {
    this.activePlayers = new Map();
    this.connections = new Map(); // Track WebSocket connections by userId
    this.cleanupInterval = setInterval(() => this.cleanupInactivePlayers(), 60000);
  }

  addPlayer(userData, ws) {
    if (!userData || !userData.userId) {
      console.error('Invalid user data:', userData);
      return;
    }

    // Check for existing connection
    const existingConnection = this.connections.get(userData.userId);
    if (existingConnection) {
      console.log('Closing existing connection for user:', userData.userId);
      existingConnection.close();
      this.activePlayers.delete(userData.userId);
    }

    // Track new connection
    this.connections.set(userData.userId, ws);

    const playerData = {
      id: userData.userId,
      username: userData.username,
      balance: userData.balance || 0,
      lastActive: Date.now(),
      status: 'watching',
      betAmount: null,
      ws,
      crashPoint: null, // unique crash point per player
      events: [],       // track player activities
      winAmount: null
    };

    console.log('Adding/Updating player:', userData.userId);
    this.activePlayers.set(userData.userId, playerData);
    this.broadcastActivePlayers();
  }

  updatePlayerActivity(userId) {
    const player = this.activePlayers.get(userId);
    if (player) {
      player.lastActive = Date.now();
    }
  }

  updatePlayerBet(userId, betData) {
    const player = this.activePlayers.get(userId);
    if (player) {
      player.lastActive = Date.now();
      player.status = 'betting';
      player.betAmount = Number(betData.amount);
      player.autoCashout = betData.autoCashout;
      player.currentMultiplier = 1.0;
      player.lastBetTime = Date.now();
      player.crashPoint = this.generateCrashPoint();

      console.log('Player bet updated:', {
        userId,
        status: player.status,
        betAmount: player.betAmount,
        currentMultiplier: player.currentMultiplier
      });

      // Log all active players and their bet amounts for debugging
      console.log('--- Active Players State ---');
      Array.from(this.activePlayers.values()).forEach(p => {
        console.log({
          id: p.id,
          username: p.username,
          status: p.status,
          betAmount: p.betAmount,
          currentMultiplier: p.currentMultiplier
        });
      });
      console.log('----------------------------');

      this.broadcastActivePlayers();
    }
  }

  // Generate a random crash point for each player (simulate fairness)
  generateCrashPoint() {
    // Example: random between 1.01 and 10.00
    return +(Math.random() * 8.99 + 1.01).toFixed(2);
  }

  updatePlayerMultiplier(multiplier) {
    this.activePlayers.forEach(player => {
      if (player.status === 'betting') {
        player.currentMultiplier = multiplier;
        // If player crashes (multiplier exceeds their crash point)
        if (multiplier >= player.crashPoint) {
          this.crashPlayer(player);
        } else if (player.autoCashout && multiplier >= player.autoCashout) {
          this.autoCashoutPlayer(player);
        }
      }
    });
    this.broadcastActivePlayers();
  }

  autoCashoutPlayer(player) {
    const winAmount = player.betAmount * player.currentMultiplier;
    player.winAmount = winAmount;
    player.status = 'won';
    player.lastWinTime = Date.now();
    player.events.push({
      type: 'cashout',
      amount: winAmount,
      multiplier: player.currentMultiplier,
      time: Date.now()
    });
    if (player.ws.readyState === 1) {
      player.ws.send(JSON.stringify({
        type: 'auto_cashout',
        winAmount,
        multiplier: player.currentMultiplier
      }));
    }
  }

  crashPlayer(player) {
    player.status = 'crashed';
    player.winAmount = 0;
    player.events.push({
      type: 'crash',
      crashPoint: player.crashPoint,
      time: Date.now()
    });
    if (player.ws.readyState === 1) {
      player.ws.send(JSON.stringify({
        type: 'crash',
        crashPoint: player.crashPoint
      }));
    }
  }

  updatePlayerWin(userId, winData) {
    const player = this.activePlayers.get(userId);
    if (player) {
      player.lastActive = Date.now();
      player.status = 'won';
      player.winAmount = winData.amount;
      player.currentMultiplier = winData.multiplier;
      player.lastWinTime = Date.now();
      player.betAmount = null;
      player.events.push({
        type: 'win',
        amount: winData.amount,
        multiplier: winData.multiplier,
        time: Date.now()
      });
      this.broadcastActivePlayers();
    }
  }

  removePlayer(userId) {
    this.activePlayers.delete(userId);
    this.connections.delete(userId);
    this.broadcastActivePlayers();
  }

  getActivePlayers() {
    const players = Array.from(this.activePlayers.values())
      .map(player => {
        // Only include necessary fields
        const cleanPlayer = {
          id: player.id,
          username: player.username,
          status: player.status,
          betAmount: player.betAmount,
          currentMultiplier: player.status === 'betting' ? player.currentMultiplier : null,
          crashPoint: player.status === 'crashed' ? player.crashPoint : null,
          winAmount: player.winAmount
        };
        return cleanPlayer;
      });

    console.log('Active players:', players);
    return players;
  }

  cleanupInactivePlayers() {
    const now = Date.now();
    for (const [id, player] of this.activePlayers) {
      if (now - player.lastActive > 60000) {
        this.connections.delete(id);
        this.activePlayers.delete(id);
      }
    }
    this.broadcastActivePlayers();
  }

  broadcastActivePlayers() {
    const players = this.getActivePlayers();
    const message = JSON.stringify({
      type: 'active_players',
      players
    });

    this.activePlayers.forEach(player => {
      if (player.ws && player.ws.readyState === 1) {
        try {
          player.ws.send(message);
        } catch (error) {
          console.error('Failed to send message to player:', player.id, error);
        }
      }
    });
  }
}

// In your WebSocket server (not shown here), make sure you handle the 'place_bet' message:
// Example handler (add to your WebSocket server setup):
// ws.on('message', (msg) => {
//   const data = JSON.parse(msg);
//   if (data.type === 'place_bet') {
//     playerService.updatePlayerBet(data.userId, data.bet);
//   }
// });

module.exports = new PlayerService();
