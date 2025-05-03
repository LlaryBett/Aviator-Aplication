const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

class ChatService {
  constructor() {
    this.socket = null;
    this.listeners = [];
  }

  connect() {
    if (this.socket && (this.socket.readyState === 1 || this.socket.readyState === 0)) {
      // Already connected or connecting
      return;
    }
    const wsUrl = BASE_URL.replace('http', 'ws');
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('WebSocket connected');
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.listeners.forEach(listener => listener(message));
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    this.socket.onclose = () => {
      console.log('WebSocket disconnected');
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  unsubscribe(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  sendMessage(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.error('WebSocket not connected');
    }
  }
}

export const chatService = new ChatService();
