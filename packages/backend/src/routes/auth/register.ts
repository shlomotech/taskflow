import type { FastifyPluginAsync } from "fastify";
import { parseWithSchema } from "../../lib/validation.js";
import {
  createAccessToken,
  createRefreshToken,
  setRefreshTokenCookie,
} from "../../lib/token.js";
import { registerBodySchema } from "../../schemas/auth.js";
import type { AuthRouteOptions } from "./types.js";

const registerRoute: FastifyPluginAsync<AuthRouteOptions> = async (
  server,
  options,
) => {
  server.post("/register", async (request, reply) => {
    const input = parseWithSchema(registerBodySchema, request.body);
    const user = await options.authService.register(input);
    const accessToken = await createAccessToken(server, options.config, user);
    const refreshToken = await createRefreshToken(server, options.config, user);

    await options.authService.storeRefreshToken({
      expiresAt: refreshToken.expiresAt,
      token: refreshToken.token,
      userId: user.id,
    });

    setRefreshTokenCookie(
      reply,
      options.config,
      refreshToken.token,
      refreshToken.expiresAt,
    );

    return reply.code(201).send({
      accessToken,
      user,
    });
  });
};

export default registerRoute;
