import type { FastifyPluginAsync } from "fastify";
import { clearRefreshTokenCookie } from "../../lib/token.js";
import type { AuthRouteOptions } from "./types.js";

const logoutRoute: FastifyPluginAsync<AuthRouteOptions> = async (server, options) => {
  server.post("/logout", async (request, reply) => {
    const refreshToken = request.cookies[options.config.REFRESH_TOKEN_COOKIE_NAME];

    if (refreshToken) {
      await options.authService.logout(refreshToken);
    }

    clearRefreshTokenCookie(reply, options.config);
    return reply.code(204).send();
  });
};

export default logoutRoute;
