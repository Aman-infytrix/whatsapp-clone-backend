import express from 'express';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import cookieParser from 'cookie-parser';
import cors from "cors";
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import errorHandler from './middlewares/errorHandler.js';
import AppError from './utils/appError.js';
import database from './config/database.js';
import swaggerSpec from './config/swagger.js';

import userRoutes from './routes/userRoutes.js';
import chatRoutes from './routes/chatRoutes.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST"],
  },
});
const PORT = process.env.PORT || 3000;

// --- FIXED CORS ---
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


app.use(express.json());
app.use(cookieParser());

// Socket.io middleware to verify JWT token
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  console.log('[Socket.io] Connection attempt, token present:', !!token);
  
  // Store token in socket for later use (allow connection even without token initially)
  if (token) {
    socket.token = token;
  }
  next();
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`[Socket.io] User connected: ${socket.id}`);

  // Join a chat room
  socket.on('join_chat', (data) => {
    const { chatId, userId } = data;
    const roomName = `chat_${chatId}`;
    socket.join(roomName);
    console.log(`[Socket.io] User ${userId} (socket: ${socket.id}) joined chat room: ${roomName}`);
    console.log(`[Socket.io] Total sockets in ${roomName}: ${io.sockets.adapter.rooms.get(roomName)?.size || 0}`);
    
    // Notify others that user is online
    socket.broadcast.to(roomName).emit('user_online', {
      userId,
      timestamp: new Date().toISOString(),
    });
  });

  // Handle new message
  socket.on('send_message', (data) => {
    const { chatId, message } = data;
    const roomName = `chat_${chatId}`;
    
    console.log(`[Socket.io] Received message from socket ${socket.id} in ${roomName}:`, message.content);
    const roomSockets = io.sockets.adapter.rooms.get(roomName);
    console.log(`[Socket.io] Room ${roomName} has ${roomSockets?.size || 0} sockets`);
    if (roomSockets) {
      console.log(`[Socket.io] Sockets in room:`, Array.from(roomSockets));
    }
    
    // Broadcast message to ALL users in the chat room
    console.log(`[Socket.io] Broadcasting receive_message event to all users in ${roomName}`);
    io.to(roomName).emit('receive_message', {
      message,
      timestamp: new Date().toISOString(),
    });
    console.log(`[Socket.io] Broadcast sent!`);
  });

  // Leave chat room
  socket.on('leave_chat', (data) => {
    const { chatId, userId } = data;
    const roomName = `chat_${chatId}`;
    socket.leave(roomName);
    console.log(`[Socket.io] User ${userId} left chat room: ${roomName}`);
    
    // Notify others that user is offline
    socket.broadcast.to(roomName).emit('user_offline', {
      userId,
      timestamp: new Date().toISOString(),
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`[Socket.io] User disconnected: ${socket.id}`);
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error(`[Socket.io] Error for socket ${socket.id}:`, error);
  });
});

app.get('/', (req, res, next) => {
  res.json({ message: 'Server is running' });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/user', userRoutes);
app.use('/chat', chatRoutes);

app.use((req, res, next) => {
  return next(new AppError(404, `Can't find ${req.originalUrl} on this server!`));
});

app.use(errorHandler);

// DB test + server start
(async () => {
  try {
    const result = await database.query('SELECT NOW()');
    console.log('Database connected successfully');
    httpServer.listen(PORT, () => {
      console.log(`http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
})();
