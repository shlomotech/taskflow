import fp from "fastify-plugin";
import type {
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}

const authenticatePlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate(
    "authenticate",
    async (request: FastifyRequest, _reply: FastifyReply) => {
      await request.jwtVerify();
    },
  );
};

export default fp(authenticatePlugin, {
  dependencies: ["jwt"],
  name: "authenticate",
});
