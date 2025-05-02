const Message = require('../models/Message');

class ChatService {
  constructor() {
    this.clients = new Set();
  }

  async addClient(ws) {
    this.clients.add(ws);
    // Send last 50 messages from database
    const messages = await Message.find()
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();
    
    ws.send(JSON.stringify({
      type: 'chat_history',
      messages: messages.reverse()
    }));
  }

  removeClient(client) {
    this.clients.delete(client);
  }

  async broadcastMessage(messageData, senderWs) {
    try {
      // Save message to database
      const message = new Message({
        text: messageData.text,
        username: messageData.username,
        avatar: messageData.avatar,
        timestamp: Date.now()
      });
      await message.save();

      // Broadcast to all clients except sender
      const broadcastData = JSON.stringify({
        type: 'chat_message',
        message
      });

      this.clients.forEach(client => {
        if (client !== senderWs && client.readyState === 1) {
          client.send(broadcastData);
        }
      });

      // Send confirmation only to sender
      senderWs.send(JSON.stringify({
        type: 'message_sent',
        message
      }));

    } catch (error) {
      console.error('Error broadcasting message:', error);
    }
  }
}

module.exports = new ChatService();
