import type { FastifyPluginAsync } from "fastify";
import { AppError } from "../../lib/errors.js";
import {
  createAccessToken,
  createRefreshToken,
  setRefreshTokenCookie,
  verifyRefreshToken,
} from "../../lib/token.js";
import type { AuthRouteOptions } from "./types.js";

const refreshRoute: FastifyPluginAsync<AuthRouteOptions> = async (server, options) => {
  server.post("/refresh", async (request, reply) => {
    const currentToken = request.cookies[options.config.REFRESH_TOKEN_COOKIE_NAME];

    if (!currentToken) {
      throw new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token");
    }

    const payload = await verifyRefreshToken(server, currentToken);
    const nextRefreshToken = await createRefreshToken(server, options.config, {
      email: payload.email,
      id: payload.sub,
    });
    const user = await options.authService.rotateRefreshToken({
      currentToken,
      expectedUserId: payload.sub,
      nextExpiresAt: nextRefreshToken.expiresAt,
      nextToken: nextRefreshToken.token,
    });

    setRefreshTokenCookie(
      reply,
      options.config,
      nextRefreshToken.token,
      nextRefreshToken.expiresAt,
    );

    return {
      accessToken: await createAccessToken(server, options.config, user),
    };
  });
};

export default refreshRoute;
