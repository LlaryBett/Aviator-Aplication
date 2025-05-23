const gameService = require('../services/gameService');
const chatService = require('../services/chatService');
const playerService = require('../services/playerService');
const ChatMessage = require('../models/ChatMessage');

// Initial chat messages
const initialMessages = [
  {
    id: 'welcome-1',
    text: 'Welcome to Aviator Game Chat! 🎮',
    username: 'System',
    timestamp: new Date().toISOString(), // Use ISO string for consistent timing
    avatar: 'https://i.pravatar.cc/150?u=system'
  },
  {
    id: 'welcome-2',
    text: 'Place your bets and enjoy the game!',
    username: 'System',
    timestamp: Date.now(),
    avatar: 'https://i.pravatar.cc/150?u=system'
  }
];

const messageQueue = [];
const MAX_MESSAGES = 100; // Keep last 100 messages

function broadcastMessage(wss, message) {
  // Add to queue and maintain max size
  messageQueue.push(message);
  if (messageQueue.length > MAX_MESSAGES) {
    messageQueue.shift();
  }

  // Broadcast to all clients
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({
        type: 'chat_message',
        message,
        timestamp: Date.now() // Add server timestamp
      }));
    }
  });
}

module.exports = function(ws, wss) {
  console.log('🔌 New WebSocket connection attempt');
  
  ws.isAlive = true;
  ws.id = Date.now().toString();
  
  chatService.addClient(ws);

  // Send immediate connection confirmation
  try {
    ws.send(JSON.stringify({
      type: 'connection_status',
      status: 'connected'
    }));
    
    // Then send chat history
    ws.send(JSON.stringify({
      type: 'chat_history',
      messages: [...initialMessages, ...messageQueue].sort((a, b) => a.timestamp - b.timestamp)
    }));

    console.log('✅ Client connection established:', ws.id);
  } catch (error) {
    console.error('❌ Failed to send initial messages:', error);
  }

  // Then send connection confirmation
  ws.send(JSON.stringify({
    type: 'connection_established',
    message: {
      text: '✅ Connected successfully to chat server',
      timestamp: Date.now(),
      id: 'system-' + Date.now(),
      username: 'System',
      avatar: 'https://i.pravatar.cc/150?u=system'
    }
  }));

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📨 New chat message:', {
        type: data.type,
        username: data.username,
        messagePreview: data.message?.substring(0, 30)
      });
      
      switch(data.type) {
        case 'chat_message':
          // Save to DB (optional)
          const chatMessage = new ChatMessage({
            userId: data.userId,
            username: data.username,
            message: data.message,
            timestamp: Date.now()
          });
          await chatMessage.save();

          // Broadcast to all clients
          wss.clients.forEach(client => {
            if (client.readyState === 1) {
              client.send(JSON.stringify({
                type: 'chat_message',
                message: {
                  _id: chatMessage._id,
                  username: chatMessage.username,
                  message: chatMessage.message,
                  timestamp: chatMessage.timestamp
                }
              }));
            }
          });
          break;
          
        case 'player_join':
          gameService.addPlayer(data.playerId, data.playerData);
          break;
          
        case 'player_bet':
          gameService.updatePlayerBet(data.playerId, data.betAmount);
          break;

        case 'user_connected':
          // Extract userId from either data.userId or data.user.id
          const userId = data.userId || (data.user && data.user.id);
          if (!userId) {
            console.error('Missing userId in user_connected message');
            return;
          }
          
          playerService.addPlayer({
            userId: userId,
            username: data.user?.username || 'Anonymous',
            balance: data.user?.balance || 0,
            avatar: data.user?.avatar
          }, ws);
          
          // Store userId on socket for later use
          ws.userId = userId;
          console.log('✅ User fully connected:', data.user?.username);
          break;

        case 'place_bet':
          playerService.updatePlayerBet(data.userId, {
            amount: data.amount,
            autoCashout: data.autoCashout
          });
          break;

        case 'cash_out':
          playerService.updatePlayerWin(data.userId, {
            amount: data.winAmount,
            multiplier: data.multiplier
          });
          break;

        case 'heartbeat':
          playerService.updatePlayerActivity(data.userId);
          break;

        case 'game_multiplier':
          playerService.updatePlayerMultiplier(data.multiplier);
          break;

        case 'balance_update':
          // Broadcast balance update to all clients
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'balance_update',
                userId: data.userId,
                newBalance: data.newBalance
              }));
            }
          });
          break;
      }
    } catch (error) {
      console.error('💬 Chat error:', error);
    }
  });

  ws.on('close', () => {
    chatService.removeClient(ws);
    if (ws.playerId) {
      gameService.removePlayer(ws.playerId);
    }
    if (ws.userId) {
      playerService.removePlayer(ws.userId);
    }
  });

  // Add ping-pong for connection health check
  ws.on('pong', () => {
    ws.isAlive = true;
  });
}

// Connection health check interval
function setupConnectionCheck(wss) {
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  return interval;
}
