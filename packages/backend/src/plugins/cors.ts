import cors from "@fastify/cors";
import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

function parseCorsOrigin(value: string | undefined) {
  if (!value) {
    return true;
  }

  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : true;
}

const corsPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(cors, {
    credentials: true,
    origin: parseCorsOrigin(process.env.CORS_ORIGIN),
  });
};

export default fp(corsPlugin, {
  name: "cors",
});
