import { buildServer } from "./app.js";
import { loadEnv } from "./config/env.js";

const env = loadEnv();
const server = buildServer({ env });

try {
  await server.listen({
    host: "0.0.0.0",
    port: env.PORT,
  });
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
