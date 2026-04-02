import { z } from "zod";

const rawEnvSchema = z
  .object({
    CORS_ORIGIN: z.string().min(1).optional(),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    JWT_ACCESS_SECRET: z.string().min(32).optional(),
    JWT_SECRET: z.string().min(32).optional(),
    NODE_ENV: z.enum(["development", "test", "production"]).default(
      "development",
    ),
    PORT: z.coerce.number().int().positive().default(3001),
  })
  .superRefine((env, context) => {
    if (!env.JWT_SECRET && !env.JWT_ACCESS_SECRET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "JWT_SECRET or JWT_ACCESS_SECRET is required",
        path: ["JWT_ACCESS_SECRET"],
      });
    }
  })
  .transform(({ JWT_SECRET, JWT_ACCESS_SECRET, ...env }) => ({
    ...env,
    JWT_ACCESS_SECRET: JWT_ACCESS_SECRET ?? JWT_SECRET!,
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
