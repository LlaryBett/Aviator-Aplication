import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Smile, Gift } from 'lucide-react';

const ChatBox = ({ messages, onSendMessage }) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };
  
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
        {messages.map((msg) => (
          <div key={msg.id} className="flex items-start">
            <img 
              src={msg.avatar} 
              alt={msg.username} 
              className="w-8 h-8 rounded-full mr-2 mt-1" 
            />
            <div>
              <div className="flex items-center">
                <span className="font-medium text-teal-400">{msg.username}</span>
                <span className="text-xs text-gray-500 ml-2">{formatTime(msg.timestamp)}</span>
              </div>
              <p className="text-white text-sm">{msg.message}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message Input */}
      <div className="p-3 border-t border-gray-700">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <button
            type="button"
            className="text-gray-400 hover:text-teal-400 transition-colors"
          >
            <Smile size={20} />
          </button>
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
};

export default ChatBox;