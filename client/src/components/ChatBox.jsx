import React, { useState, useRef, useEffect, memo } from 'react';
import { Send, MessageSquare, Gift } from 'lucide-react';
import { chatService } from '../services/chatService';
import { useAuth } from '../context/AuthContext';

const ChatBox = memo(() => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    chatService.connect();

    const messageListener = (message) => {
      // Ensure the message has valid text and username
      if (message.text && message.username && message.username.trim() !== '') {
        setMessages(prevMessages => [...prevMessages, message]);
      }
    };

    chatService.subscribe(messageListener);

    return () => {
      chatService.unsubscribe(messageListener);
    };
  }, []);

  // Auto-scroll behavior
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    // Check if user is authenticated
    if (!user) {
      alert('You must be logged in to send messages.');
      return;
    }

    const messageData = {
      text: newMessage.trim(),
      username: user.username,
      avatar: `https://i.pravatar.cc/150?u=${user.username}`,
      timestamp: Date.now(),
    };

    // Local echo for instant feedback
    setMessages(prev => [...prev, messageData]);
    chatService.sendMessage(messageData);
    setNewMessage('');
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(Number(timestamp));
    return date.getTime() ? 
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-gray-800/90 backdrop-blur-md border border-gray-700 rounded-lg flex flex-col h-full">
      <div className="p-3 border-b border-gray-700 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <MessageSquare size={18} className="mr-2 text-gray-400" />
          Live Chat
        </h3>
        <button className="text-gray-400 hover:text-teal-400 transition-colors">
          <Gift size={18} />
        </button>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, index) => (
          <div key={index} className="flex items-start">
            <img 
              src={msg.avatar || '/default-avatar.png'} 
              alt={msg.username || 'Anonymous'} 
              className="w-8 h-8 rounded-full mr-2 mt-1" 
            />
            <div>
              <div className="flex items-center">
                <span className="font-medium text-teal-400">{msg.username || 'Anonymous'}</span>
                <span className="text-xs text-gray-500 ml-2">{formatTime(msg.timestamp)}</span>
              </div>
              <p className="text-white text-sm">{msg.text}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-3 border-t border-gray-700 relative">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className={`px-3 py-2 rounded ${
              newMessage.trim()
                ? 'bg-teal-600 hover:bg-teal-700 text-white' 
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            } transition-colors`}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
});

export default ChatBox;