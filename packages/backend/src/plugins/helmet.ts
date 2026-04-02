import helmet from "@fastify/helmet";
import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

const helmetPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(helmet);
};

export default fp(helmetPlugin, {
  name: "helmet",
});
