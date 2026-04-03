import type { FastifyPluginAsync } from "fastify";
import { ZodError } from "zod";
import { AppError } from "../services/errors.js";

const statusCodeToErrorCode: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "VALIDATION_ERROR",
};

export const errorHandlerPlugin: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(422).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input.",
          details: error.issues,
        },
      });
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    const statusCode =
      typeof error.statusCode === "number" && error.statusCode >= 400
        ? error.statusCode
        : 500;

    if (statusCode >= 500) {
      app.log.error(error);
    }

    return reply.status(statusCode).send({
      error: {
        code: statusCodeToErrorCode[statusCode] ?? "INTERNAL_ERROR",
        message: statusCode >= 500 ? "Unexpected error." : error.message,
      },
    });
  });
};
