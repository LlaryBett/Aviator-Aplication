import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const MAX_MESSAGES = 100; // Keep last 100 messages
const AUTO_SCROLL_THRESHOLD = 100; // pixels from bottom

const ChatBox = () => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [autoScroll, setAutoScroll] = useState(true);
    const messagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);
    const wsRef = useRef(null); // Store WebSocket reference
    const { user } = useAuth();

    const scrollToBottom = () => {
        if (autoScroll) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleScroll = () => {
        if (!chatContainerRef.current) return;

        const { scrollHeight, scrollTop, clientHeight } = chatContainerRef.current;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

        setAutoScroll(distanceFromBottom < AUTO_SCROLL_THRESHOLD);
    };

    const addMessage = useCallback((newMessage) => {
        setMessages(prev => {
            // Use a Map to deduplicate by id/_id
            const map = new Map();
            [...prev, newMessage].forEach(msg => {
                const key = msg._id || msg.id;
                if (key) map.set(key, msg);
            });
            // Sort and slice
            return Array.from(map.values())
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                .slice(-MAX_MESSAGES);
        });
    }, []);

    const fetchMessages = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/chat/messages`);
            if (!response.ok) {
                throw new Error('Failed to fetch messages');
            }
            const data = await response.json();
            // Deduplicate on fetch as well
            const map = new Map();
            data.forEach(msg => {
                const key = msg._id || msg.id;
                if (key) map.set(key, msg);
            });
            setMessages(Array.from(map.values())
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                .slice(-MAX_MESSAGES));
            scrollToBottom();
        } catch (error) {
            console.error('Failed to fetch messages:', error);
            setMessages([]);
        }
    };

    useEffect(() => {
        let reconnectAttempts = 0;
        const maxReconnectAttempts = 5;

        const connectWebSocket = () => {
            const wsUrl = BACKEND_URL.replace(/^http/, 'ws'); // This gives ws://localhost:5000
            wsRef.current = new WebSocket(wsUrl); // Store WebSocket in ref

            wsRef.current.onopen = () => {
                console.log('✅ Chat WebSocket connected');
                reconnectAttempts = 0;
            };

            wsRef.current.onclose = () => {
                console.log('❌ Chat WebSocket closed');
                if (reconnectAttempts < maxReconnectAttempts) {
                    reconnectAttempts++;
                    setTimeout(connectWebSocket, 1000 * reconnectAttempts);
                }
            };

            wsRef.current.onerror = (error) => {
                console.error('Chat WebSocket error:', error);
            };

            wsRef.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'chat_message') {
                    addMessage(data.message);
                    scrollToBottom();
                }
            };
        };

        fetchMessages();
        connectWebSocket();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [addMessage]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;

        // Use existing WebSocket connection
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'chat_message',
                userId: user._id,
                username: user.username,
                message: newMessage.trim()
            }));
            setNewMessage('');
        } else {
            console.error('WebSocket not connected');
        }
    };

    // Deduplicate messages before rendering
    const dedupedMessages = React.useMemo(() => {
        const map = new Map();
        messages.forEach(msg => {
            const key = msg._id || msg.id;
            if (key) map.set(key, msg);
        });
        return Array.from(map.values())
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }, [messages]);

    const renderMessage = (msg) => (
        <div
            key={msg._id || msg.id}
            className="flex items-start gap-3 p-2 hover:bg-gray-700/30 rounded"
        >
            <img
                src={`https://i.pravatar.cc/150?u=${msg.username}`}
                alt=""
                className="w-8 h-8 rounded-full bg-gray-600"
            />
            <div>
                <div className="flex items-baseline gap-2">
                    <span className="font-medium text-white">{msg.username}</span>
                    <span className="text-xs text-gray-400">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                </div>
                <p className="text-gray-300 text-sm">{msg.message}</p>
            </div>
        </div>
    );

    return (
        <div className="bg-gray-800 rounded-lg flex flex-col h-full">
            <div className="p-4 border-b border-gray-700">
                <h2 className="font-semibold">Live Chat</h2>
            </div>

            <div
                ref={chatContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
            >
                {dedupedMessages.map(renderMessage)}
                <div ref={messagesEndRef} />
                {!autoScroll && messages.length > 0 && (
                    <button
                        onClick={() => {
                            setAutoScroll(true);
                            scrollToBottom();
                        }}
                        className="fixed bottom-20 right-8 bg-teal-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-teal-700"
                    >
                        ↓ New messages
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={user ? "Type a message..." : "Login to chat"}
                        disabled={!user}
                        className="flex-1 bg-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                    <button
                        type="submit"
                        disabled={!user || !newMessage.trim()}
                        className="bg-teal-600 text-white p-2 rounded hover:bg-teal-700 disabled:opacity-50"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChatBox;