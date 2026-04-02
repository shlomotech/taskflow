import "dotenv/config";

const { buildApp } = await import("./app.js");

const app = buildApp();
const host = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? "3001");

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
