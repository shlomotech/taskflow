declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      email: string;
      id: string;
      sub: string;
      type: "access";
    };
    user: {
      email: string;
      id: string;
      sub: string;
      type: "access";
    };
  }
}
