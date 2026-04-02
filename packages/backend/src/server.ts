import { buildServer } from "./app.js";
import { loadEnv } from "./config/env.js";

const env = loadEnv();
const server = buildServer({ env });

async function startServer() {
  try {
    await server.listen({
      port: env.PORT,
      host: "0.0.0.0",
    });
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void server.close().finally(() => {
      process.exit(0);
    });
  });
}

void startServer();
