const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });
const apiRoutes = require('./src/routes/api');
const websocketHandler = require('./src/routes/websocket');
const authRoutes = require('./src/routes/auth');
const transactionRoutes = require('./src/routes/transactions');
const chatRoutes = require('./src/routes/chat');

// Add M-Pesa environment checks
console.log('Environment Check:');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Is set' : 'NOT SET');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Is set' : 'NOT SET');
console.log('MPESA_SHORTCODE:', process.env.MPESA_SHORTCODE ? 'Is set' : 'NOT SET');
console.log('MPESA_PASSKEY:', process.env.MPESA_PASSKEY ? 'Is set' : 'NOT SET');
console.log('MPESA_CONSUMER_KEY:', process.env.MPESA_CONSUMER_KEY ? 'Is set' : 'NOT SET');
console.log('MPESA_CONSUMER_SECRET:', process.env.MPESA_CONSUMER_SECRET ? 'Is set' : 'NOT SET');

// Validate required M-Pesa variables
const requiredEnvVars = [
  'MPESA_SHORTCODE',
  'MPESA_PASSKEY',
  'MPESA_CONSUMER_KEY',
  'MPESA_CONSUMER_SECRET'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server }); // No path, listens on ws://localhost:5000/
app.set('wss', wss); // Make WebSocket server available to routes

// Middleware
const allowedOrigins = [
  'https://aviator-aplication.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};

// Add route debugging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.use(cors(corsOptions));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Aviator backend is running!');
});

app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/chat', chatRoutes);

// WebSocket server setup with error handling
wss.on('connection', (ws) => {
  console.log('🔌 WebSocket client connected');
  
  ws.isAlive = true;
  ws.on('pong', () => ws.isAlive = true);

  ws.on('message', (msg) => {
    // ...handle messages...
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
  });

  websocketHandler(ws, wss);
});

// Add ping interval to keep connections alive
const pingInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// Clean up on server close
server.on('close', () => {
  clearInterval(pingInterval);
});

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

server.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});

// Yes, this file (server.js) is the main entry point for your entire backend server.
// It sets up the Express HTTP server, the WebSocket server, connects to MongoDB, and mounts all API and WebSocket routes.
// It is responsible for starting the server, handling HTTP and WebSocket connections, and initializing all middleware and routes.

// In contrast, src/index.js (from previous examples) is typically used for WebSocket-specific logic or as a secondary entry point for real-time features only.
// server.js is the "main" server bootstrap file for your whole backend application.
