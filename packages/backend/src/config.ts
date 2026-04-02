import { z } from "zod";

const rawEnvSchema = z
  .object({
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    JWT_SECRET: z.string().min(32).optional(),
    JWT_ACCESS_SECRET: z.string().min(32).optional(),
    JWT_REFRESH_SECRET: z.string().min(32).optional(),
    JWT_ACCESS_EXPIRY: z.string().min(1).default("15m"),
    JWT_REFRESH_EXPIRY: z.string().min(1).default("7d"),
    CORS_ORIGIN: z.string().min(1).optional(),
    REFRESH_TOKEN_COOKIE_NAME: z.string().min(1).default("refreshToken"),
    PORT: z.coerce.number().int().positive().default(3001),
    NODE_ENV: z.enum(["development", "test", "production"]).default(
      "development",
    ),
  })
  .superRefine((env, context) => {
    if (!env.JWT_SECRET && !env.JWT_ACCESS_SECRET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "JWT_SECRET or JWT_ACCESS_SECRET is required",
        path: ["JWT_ACCESS_SECRET"],
      });
    }

    if (!env.JWT_SECRET && !env.JWT_REFRESH_SECRET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "JWT_SECRET or JWT_REFRESH_SECRET is required",
        path: ["JWT_REFRESH_SECRET"],
      });
    }
  })
  .transform(({ JWT_SECRET, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, ...env }) => ({
    ...env,
    JWT_ACCESS_SECRET: JWT_ACCESS_SECRET ?? JWT_SECRET!,
    JWT_REFRESH_SECRET: JWT_REFRESH_SECRET ?? JWT_SECRET!,
  }));

export type Config = Readonly<z.infer<typeof rawEnvSchema>>;

export function createConfig(
  source: Record<string, string | undefined> = process.env,
): Config {
  const parsed = rawEnvSchema.safeParse(source);

  if (parsed.success) {
    return parsed.data;
  }

  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid environment configuration: ${details}`);
}
