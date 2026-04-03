import fastify, { type FastifyServerOptions } from "fastify";
import fastifyHelmet from "@fastify/helmet";
import type { AppConfig } from "./config.js";
import { getConfig } from "./config.js";
import type { ProjectRoleResolver } from "./middleware/authorize-project.js";
import { authPlugin } from "./plugins/auth.js";
import { corsPlugin } from "./plugins/cors.js";
import { errorHandlerPlugin } from "./plugins/error-handler.js";
import { routesPlugin } from "./routes/index.js";

export interface BuildAppOptions extends FastifyServerOptions {
  config?: AppConfig;
  projectRoleResolver?: ProjectRoleResolver;
}

export async function buildApp(options: BuildAppOptions = {}) {
  const {
    config = getConfig(),
    projectRoleResolver,
    ...fastifyOptions
  } = options;

  const app = fastify(fastifyOptions);

  app.decorate("config", config);

  if (projectRoleResolver) {
    app.decorate("projectRoleResolver", projectRoleResolver);
  }

  await app.register(errorHandlerPlugin);
  await app.register(fastifyHelmet);
  await app.register(corsPlugin);
  await app.register(authPlugin);
  await app.register(routesPlugin);

  return app;
}
