import { buildApp } from "./app.js";
import { getConfig } from "./config.js";
import { migrate } from "./db/migrate.js";

async function main() {
  const config = getConfig();
  const app = await buildApp({
    config,
    logger: {
      level: config.NODE_ENV === "production" ? "info" : "debug",
    },
  });

  try {
    await migrate(app);
    await app.listen({
      host: "0.0.0.0",
      port: config.PORT,
    });
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  }
}

void main();
