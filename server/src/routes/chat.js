const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const chatService = require('../services/chatService');
const auth = require('../middleware/auth');

// Get chat messages
router.get('/messages', async (req, res) => {
    try {
        const messages = await ChatMessage.find()
            .sort({ createdAt: -1 })
            .limit(50)
            .select('username message timestamp');
        
        res.json(messages.reverse());
    } catch (error) {
        console.error('Chat messages fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch chat messages' });
    }
});

// Post new message
router.post('/messages', auth, async (req, res) => {
    try {
        const message = await chatService.saveAndBroadcastMessage(
            req.user._id,
            req.user.username,
            req.body.message
        );
        res.status(201).json(message);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
