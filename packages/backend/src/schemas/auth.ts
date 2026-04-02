import { z } from "zod";

const emailSchema = z.string().trim().email("A valid email address is required");

export const registerBodySchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(1, "Name is required").max(100),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(72, "Password must be 72 characters or fewer"),
});

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type RefreshBody = z.infer<typeof refreshBodySchema>;
