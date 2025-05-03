const ChatMessage = require('../models/ChatMessage');

class ChatService {
    constructor() {
        this.clients = new Set();
        this.messages = [];
    }

    addClient(ws) {
        this.clients.add(ws);
        console.log('📱 Chat client connected. Total clients:', this.clients.size);
    }

    removeClient(ws) {
        this.clients.delete(ws);
        console.log('📱 Chat client disconnected. Total clients:', this.clients.size);
    }

    broadcastMessage(message) {
        console.log('💬 Broadcasting message:', message.text?.substring(0, 30));
        this.clients.forEach(client => {
            if (client.readyState === 1) { // WebSocket.OPEN
                client.send(JSON.stringify({
                    type: 'chat_message',
                    message
                }));
            }
        });
    }

    async saveAndBroadcastMessage(userId, username, text) {
        try {
            const message = new ChatMessage({
                userId,
                username,
                message: text,
                timestamp: Date.now()
            });
            
            await message.save();
            this.broadcastMessage(message);
            return message;
        } catch (error) {
            console.error('Failed to save chat message:', error);
            throw error;
        }
    }
}

module.exports = new ChatService();
