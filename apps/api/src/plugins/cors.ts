import fastifyCors from "@fastify/cors";
import type { FastifyPluginAsync } from "fastify";

export const corsPlugin: FastifyPluginAsync = async (app) => {
  await app.register(fastifyCors, {
    origin: app.config.CORS_ORIGIN,
    credentials: true,
  });
};
