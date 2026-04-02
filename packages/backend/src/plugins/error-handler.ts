import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import {
  AppError,
  formatZodFieldErrors,
  getPrismaTargetFields,
  hasStatusCode,
  isJwtError,
  isPrismaKnownRequestError,
} from "../lib/errors.js";

export function registerErrorHandler(server: FastifyInstance) {
  server.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
        statusCode: error.statusCode,
        ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
      });
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        message: "Request validation failed",
        statusCode: 400,
        fieldErrors: formatZodFieldErrors(error.issues),
      });
    }

    if (isPrismaKnownRequestError(error)) {
      if (error.code === "P2002") {
        const targetFields = getPrismaTargetFields(error);
        const fieldErrors =
          targetFields.length > 0
            ? Object.fromEntries(
                targetFields.map((field) => [field, ["Already exists"]]),
              )
            : undefined;

        return reply.status(409).send({
          error: "CONFLICT",
          message: "Resource already exists",
          statusCode: 409,
          ...(fieldErrors ? { fieldErrors } : {}),
        });
      }

      if (error.code === "P2025") {
        return reply.status(404).send({
          error: "NOT_FOUND",
          message: "Resource not found",
          statusCode: 404,
        });
      }
    }

    if (isJwtError(error)) {
      return reply.status(401).send({
        error: "UNAUTHORIZED",
        message: "Invalid or expired token",
        statusCode: 401,
      });
    }

    if (hasStatusCode(error)) {
      const statusError = error as Error & {
        code?: string;
        statusCode: number;
        fieldErrors?: Record<string, string[]>;
      };

      return reply.status(statusError.statusCode).send({
        error: statusError.code ?? "REQUEST_ERROR",
        message: statusError.message,
        statusCode: statusError.statusCode,
        ...(statusError.fieldErrors ? { fieldErrors: statusError.fieldErrors } : {}),
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
