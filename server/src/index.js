const playerService = require('./services/playerService');

wss.on('connection', (ws) => {
  console.log('🔌 New client connected');

  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true; // Mark the connection as alive on pong
  });

  ws.on('message', (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
      console.log('📨 Received message:', data);

      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' })); // Respond to ping
        console.log('📤 Sent heartbeat (pong)');
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      return;
    }

    if (data.type === 'user_connected') {
      playerService.addPlayer(data.user, ws);
    }
  });

  ws.on('close', () => {
    console.log('🔌 Client disconnected');
    playerService.removePlayer(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Heartbeat mechanism to terminate inactive connections
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      console.log('Terminating inactive connection');
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping(); // Send a ping to check if the connection is alive
  });
}, 30000); // Run every 30 seconds