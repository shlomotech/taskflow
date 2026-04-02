import type { FastifyPluginAsync } from "fastify";
import loginRoute from "./login.js";
import logoutRoute from "./logout.js";
import refreshRoute from "./refresh.js";
import registerRoute from "./register.js";
import type { AuthRouteOptions } from "./types.js";

const authRoutes: FastifyPluginAsync<AuthRouteOptions> = async (server, options) => {
  const routeOptions = {
    authService: options.authService,
    config: options.config,
  };

  await server.register(registerRoute, routeOptions);
  await server.register(loginRoute, routeOptions);
  await server.register(refreshRoute, routeOptions);
  await server.register(logoutRoute, routeOptions);
};

export default authRoutes;
