import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();
const server = http.createServer(app);

// CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173'
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all during development
      }
    },
    credentials: true
  })
);

// Socket.IO setup
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  }
});

// Attach io to req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static folder for uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'online',
    system: 'RailReady Shed Management & Pre-Deployment Platform API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    disclaimer: 'Academic software management platform. Not for real-world safety certification.'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Socket.IO event handler
io.on('connection', (socket) => {
  logger.info(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('join_room', (room) => {
    socket.join(room);
    logger.debug(`[Socket.IO] Socket ${socket.id} joined room: ${room}`);
  });

  socket.on('disconnect', () => {
    logger.info(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Fallback placeholder for 404 & Error handlers
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    server.listen(PORT, () => {
      logger.info(`[RailReady Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  });
}

export { app, server, io };
