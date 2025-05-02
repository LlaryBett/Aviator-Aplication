const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const cors = require('cors');
const apiRoutes = require('./src/routes/api');
const websocketHandler = require('./src/routes/websocket');
const authRoutes = require('./src/routes/auth');
const transactionRoutes = require('./src/routes/transactions');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
app.set('wss', wss); // Make WebSocket server available to routes

// Middleware
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.com']  // Replace with your frontend URL
    : 'http://localhost:3000',
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : err.message 
  });
});

// WebSocket server setup with error handling
wss.on('connection', (ws) => {
  console.log('🔌 New client connected');
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  ws.on('close', () => {
    console.log('🔌 Client disconnected');
  });

  websocketHandler(ws, wss);
});

// Add heartbeat to prevent disconnections
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Add MongoDB connection logging
mongoose.connection.once('open', () => {
  console.log('✅ Connected to MongoDB database');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

// Let Render assign the port, fallback to 5000 for local development
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Yes, this file (server.js) is the main entry point for your entire backend server.
// It sets up the Express HTTP server, the WebSocket server, connects to MongoDB, and mounts all API and WebSocket routes.
// It is responsible for starting the server, handling HTTP and WebSocket connections, and initializing all middleware and routes.

// In contrast, src/index.js (from previous examples) is typically used for WebSocket-specific logic or as a secondary entry point for real-time features only.
// server.js is the "main" server bootstrap file for your whole backend application.
