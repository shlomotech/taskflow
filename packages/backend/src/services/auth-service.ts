import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import type { Pool } from "pg";
import { AppError } from "../lib/errors.js";
import type { LoginBody, RegisterBody } from "../schemas/auth.js";

interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthService {
  registerUser(input: RegisterBody): Promise<AuthUser>;
  authenticateUser(input: LoginBody): Promise<AuthUser>;
  getUserById(userId: string): Promise<AuthUser | null>;
}

export class PostgresAuthService implements AuthService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly UNIQUE_VIOLATION_CODE = "23505";

  constructor(private readonly pool: Pool) {}

  async registerUser(input: RegisterBody) {
    const id = randomUUID();
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();
    const passwordHash = await bcrypt.hash(
      input.password,
      PostgresAuthService.SALT_ROUNDS,
    );

    try {
      const result = await this.pool.query<AuthUser>(
        `
          INSERT INTO users (id, email, name, password_hash)
          VALUES ($1, $2, $3, $4)
          RETURNING id, email, name
        `,
        [id, email, name, passwordHash],
      );

      return result.rows[0];
    } catch (error) {
      if (isDatabaseError(error)) {
        if (error.code === PostgresAuthService.UNIQUE_VIOLATION_CODE) {
          throw new AppError(409, "EMAIL_TAKEN", "Email is already in use");
        }
      }

      throw error;
    }
  }

  async authenticateUser(input: LoginBody) {
    const email = input.email.trim().toLowerCase();
    const result = await this.pool.query<UserRow>(
      `
        SELECT id, email, name, password_hash
        FROM users
        WHERE email = $1
        LIMIT 1
      `,
      [email],
    );

    const user = result.rows[0];

    if (!user) {
      throw invalidCredentialsError();
    }

    const isValidPassword = await bcrypt.compare(input.password, user.password_hash);

    if (!isValidPassword) {
      throw invalidCredentialsError();
    }

    return mapAuthUser(user);
  }

  async getUserById(userId: string) {
    const result = await this.pool.query<AuthUser>(
      `
        SELECT id, email, name
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [userId],
    );

    return result.rows[0] ?? null;
  }
}

function mapAuthUser(user: Pick<UserRow, "id" | "email" | "name">): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

function invalidCredentialsError() {
  return new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
}

function isDatabaseError(
  error: unknown,
): error is {
  code?: string;
} {
  return typeof error === "object" && error !== null && "code" in error;
}
