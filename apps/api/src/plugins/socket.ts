import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { Server as SocketIOServer } from 'socket.io';

declare module 'fastify' {
  interface FastifyInstance {
    io: SocketIOServer;
  }
}

export const socketPlugin = fp(
  async (app) => {
    const io = new SocketIOServer(app.server, {
      cors: { origin: app.config.CORS_ORIGIN, methods: ['GET', 'POST'] },
    });

    io.use(async (socket, next) => {
      const token = socket.handshake.auth.token as string | undefined;
      if (!token) return next(new Error('Authentication required'));
      try {
        await app.jwt.verify(token);
        next();
      } catch {
        next(new Error('Invalid token'));
      }
    });

    io.on('connection', (socket) => {
      app.log.debug({ socketId: socket.id }, 'Socket connected');

      socket.on('join:board', (boardId: string) => {
        void socket.join(`board:${boardId}`);
      });
      socket.on('leave:board', (boardId: string) => {
        void socket.leave(`board:${boardId}`);
      });

      socket.on('disconnect', () => {
        app.log.debug({ socketId: socket.id }, 'Socket disconnected');
      });
    });

    app.decorate('io', io);

    app.addHook('onClose', (_instance, done) => {
      io.close(done);
    });
  } satisfies FastifyPluginAsync,
  { name: 'socket' },
);
