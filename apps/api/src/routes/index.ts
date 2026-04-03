import type { FastifyPluginAsync } from "fastify";

export const routesPlugin: FastifyPluginAsync = async (app) => {
  app.get("/api/v1/health", async () => ({
    data: {
      status: "ok",
    },
  }));
};
