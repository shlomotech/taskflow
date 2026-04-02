import { type ZodIssue } from "zod";

export type FieldErrors = Record<string, string[]>;

export interface AppErrorOptions {
  cause?: unknown;
  fieldErrors?: FieldErrors;
}

export class AppError extends Error {
  readonly code: string;
  readonly fieldErrors?: FieldErrors;
  readonly statusCode: number;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    options: AppErrorOptions = {},
  ) {
    super(message, options.cause ? { cause: options.cause } : undefined);

    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.fieldErrors = options.fieldErrors;
  }
}

export function formatZodFieldErrors(issues: ZodIssue[]): FieldErrors {
  return issues.reduce<FieldErrors>((fieldErrors, issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "_root";

    if (!fieldErrors[path]) {
      fieldErrors[path] = [];
    }

    fieldErrors[path].push(issue.message);
    return fieldErrors;
  }, {});
}

export function registerErrorHandler(server: {
  setErrorHandler: (
    handler: (
      error: unknown,
      request: { log: { error: (error: unknown) => void } },
      reply: {
        status: (code: number) => { send: (body: unknown) => unknown };
      },
    ) => unknown,
  ) => void;
}) {
  server.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
        statusCode: error.statusCode,
        ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
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
