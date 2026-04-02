import type { FastifyPluginAsync } from "fastify";
import { parseWithSchema } from "../../lib/validation.js";
import {
  createAccessToken,
  createRefreshToken,
  setRefreshTokenCookie,
} from "../../lib/token.js";
import { loginBodySchema } from "../../schemas/auth.js";
import type { AuthRouteOptions } from "./types.js";

const loginRoute: FastifyPluginAsync<AuthRouteOptions> = async (server, options) => {
  server.post("/login", async (request, reply) => {
    const input = parseWithSchema(loginBodySchema, request.body);
    const user = await options.authService.login(input);
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

    return {
      accessToken,
      user,
    };
  });
};

export default loginRoute;
