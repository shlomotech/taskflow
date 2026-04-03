import type { FastifyInstance } from "fastify";

export async function migrate(app: FastifyInstance) {
  app.log.debug("Skipping migrations until the database layer is wired.");
}
