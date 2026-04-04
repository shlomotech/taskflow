import { Server as SocketIOServer } from 'socket.io';
import type { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import type { JwtUser } from './middleware/authenticate.js';

export function createSocketServer(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  // Authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(
        token,
        process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
      ) as JwtUser;
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Join a board room to receive real-time updates
    socket.on('join:board', (boardId: string) => {
      void socket.join(`board:${boardId}`);
    });
    socket.on('leave:board', (boardId: string) => {
      void socket.leave(`board:${boardId}`);
    });
  });

  return io;
}
