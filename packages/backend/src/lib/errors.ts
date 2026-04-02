import type { FastifyInstance } from "fastify";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function registerErrorHandler(server: FastifyInstance) {
  server.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
        statusCode: error.statusCode,
      });
    }

    if (hasStatusCode(error)) {
      return reply.status(error.statusCode).send({
        error: error.code ?? "REQUEST_ERROR",
        message: error.message,
        statusCode: error.statusCode,
      });
    }

    request.log.error(error);

    return reply.status(500).send({
      error: "INTERNAL_SERVER_ERROR",
      message: "Internal server error",
      statusCode: 500,
    });
  });
}

function hasStatusCode(
  error: unknown,
): error is Error & {
  code?: string;
  statusCode: number;
} {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  );
}
