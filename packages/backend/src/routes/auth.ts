import type { FastifyPluginAsync } from "fastify";
import type { AppEnv } from "../config/env.js";
import {
  createAccessToken,
  createAuthTokens,
  verifyRefreshToken,
} from "../lib/auth-tokens.js";
import { AppError } from "../lib/errors.js";
import { parseWithSchema } from "../lib/validation.js";
import {
  loginBodySchema,
  refreshBodySchema,
  registerBodySchema,
} from "../schemas/auth.js";
import type { AuthService } from "../services/auth-service.js";

interface AuthRoutesOptions {
  authService: AuthService;
  env: AppEnv;
}

const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (
  server,
  options,
) => {
  server.post("/register", async (request, reply) => {
    const body = parseWithSchema(registerBodySchema, request.body);
    const user = await options.authService.registerUser(body);
    const tokens = await createAuthTokens(server, options.env, user);

    return reply.code(201).send({
      ...tokens,
      user,
    });
  });

  server.post("/login", async (request) => {
    const body = parseWithSchema(loginBodySchema, request.body);
    const user = await options.authService.authenticateUser(body);
    const tokens = await createAuthTokens(server, options.env, user);

    return {
      ...tokens,
      user,
    };
  });

  server.post("/refresh", async (request) => {
    const body = parseWithSchema(refreshBodySchema, request.body);
    const payload = await verifyRefreshToken(server, body.refreshToken);
    const user = await options.authService.getUserById(payload.sub);

    if (!user) {
      throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token");
    }

    return {
      accessToken: await createAccessToken(server, options.env, user),
    };
  });
};

export default authRoutes;
