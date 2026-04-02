import { type ZodIssue } from "zod";

export type FieldErrors = Record<string, string[]>;

export interface AppErrorOptions {
  cause?: unknown;
  fieldErrors?: FieldErrors;
}

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly fieldErrors?: FieldErrors;

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

export function isPrismaKnownRequestError(
  error: unknown,
): error is Error & {
  code: string;
  meta?: {
    target?: string[] | string;
  };
} {
  return (
    error instanceof Error &&
    "code" in error &&
    typeof error.code === "string" &&
    /^P\d{4}$/.test(error.code)
  );
}

export function getPrismaTargetFields(
  error: Error & {
    meta?: {
      target?: string[] | string;
    };
  },
): string[] {
  const target = error.meta?.target;

  if (Array.isArray(target)) {
    return target.filter((field): field is string => typeof field === "string");
  }

  if (typeof target === "string") {
    return [target];
  }

  return [];
}

export function isJwtError(
  error: unknown,
): error is Error & {
  code?: string;
  statusCode?: number;
} {
  if (!(error instanceof Error)) {
    return false;
  }

  if (
    error.name === "JsonWebTokenError" ||
    error.name === "TokenExpiredError" ||
    error.name === "NotBeforeError"
  ) {
    return true;
  }

  return "code" in error && typeof error.code === "string" && error.code.startsWith("FST_JWT_");
}

export function hasStatusCode(
  error: unknown,
): error is Error & {
  code?: string;
  statusCode: number;
  fieldErrors?: FieldErrors;
} {
  return (
    error instanceof Error &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  );
}
