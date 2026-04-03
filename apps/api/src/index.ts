import Fastify from "fastify";
import cors from "@fastify/cors";
import { taskRoutes } from "./routes/tasks.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
});

await app.register(taskRoutes);

app.get("/api/health", async () => ({ status: "ok" }));

const port = parseInt(process.env.API_PORT ?? "3001", 10);

try {
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`TaskFlow API running on http://localhost:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
