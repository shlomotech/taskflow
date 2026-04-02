import type { FastifyJwtNamespace } from "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      email: string;
      jti?: string;
      sub: string;
      type: "access" | "refresh";
    };
    user: {
      email: string;
      id: string;
    };
  }
}

declare module "fastify" {
  interface FastifyInstance
    extends FastifyJwtNamespace<{ namespace: "refresh" }> {}
}
