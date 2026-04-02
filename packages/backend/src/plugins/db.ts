import { drizzle } from "drizzle-orm/postgres-js";
import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import postgres from "postgres";

type Database = ReturnType<typeof drizzle>;

const globalForDb = globalThis as typeof globalThis & {
  __taskflowDb?: Database;
  __taskflowSql?: ReturnType<typeof postgres>;
};

function getDatabase() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  if (!globalForDb.__taskflowSql) {
    globalForDb.__taskflowSql = postgres(connectionString);
  }

  if (!globalForDb.__taskflowDb) {
    globalForDb.__taskflowDb = drizzle(globalForDb.__taskflowSql);
  }

  return globalForDb.__taskflowDb;
}

declare module "fastify" {
  interface FastifyInstance {
    db: Database;
  }
}

const dbPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate("db", getDatabase());
};

export default fp(dbPlugin, {
  name: "db",
});
