import type { AppConfig } from "../config.js";
import type { ProjectRoleResolver } from "../middleware/authorize-project.js";
import type { AuthenticatedUser } from "./auth.js";

declare module "fastify" {
  interface FastifyInstance {
    config: AppConfig;
    projectRoleResolver?: ProjectRoleResolver;
    signAccessToken: (user: AuthenticatedUser) => string;
    signRefreshToken: (user: AuthenticatedUser) => string;
    verifyRefreshToken: (token: string) => Promise<AuthenticatedUser>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthenticatedUser;
    user: AuthenticatedUser;
  }
}
