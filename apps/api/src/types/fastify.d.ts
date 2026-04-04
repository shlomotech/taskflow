import type { AppConfig } from '../config.js';
import type { ProjectRoleResolver } from '../middleware/authorize-project.js';
import type { AuthenticatedUser } from './auth.js';
import type { Database } from '../db/index.js';
import type { Server as SocketIOServer } from 'socket.io';

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
    projectRoleResolver?: ProjectRoleResolver;
    signAccessToken: (user: AuthenticatedUser) => string;
    signRefreshToken: (user: AuthenticatedUser) => string;
    verifyRefreshToken: (token: string) => Promise<AuthenticatedUser>;
    db: Database;
    io: SocketIOServer;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthenticatedUser;
    user: AuthenticatedUser;
  }
}
