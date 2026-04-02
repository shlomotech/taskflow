import rateLimit, { type RateLimitOptions } from "@fastify/rate-limit";
import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

const AUTH_ROUTE_PREFIX = "/api/v1/auth";
const AUTH_RATE_LIMIT: RateLimitOptions = {
  max: 10,
  timeWindow: "1 minute",
};

const rateLimitPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(rateLimit, {
    global: false,
  });

  fastify.addHook("onRoute", (routeOptions) => {
    if (!routeOptions.url.startsWith(AUTH_ROUTE_PREFIX)) {
      return;
    }

    const authRateLimit = fastify.rateLimit(AUTH_RATE_LIMIT);
    const existingPreHandler = routeOptions.preHandler;

    if (!existingPreHandler) {
      routeOptions.preHandler = [authRateLimit];
      return;
    }

    routeOptions.preHandler = Array.isArray(existingPreHandler)
      ? [...existingPreHandler, authRateLimit]
      : [existingPreHandler, authRateLimit];
  });
};

export default fp(rateLimitPlugin, {
  name: "rate-limit",
});
