import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { AppError } from "../lib/errors.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import type { LoginBody, RegisterBody } from "../schemas/auth.js";

interface UserRow {
  email: string;
  id: string;
  name: string;
  password_hash: string;
}

interface RefreshTokenRow {
  expires_at: Date | string;
  user_id: string;
}

export interface AuthUser {
  email: string;
  id: string;
  name: string;
}

export interface StoreRefreshTokenInput {
  expiresAt: Date;
  token: string;
  userId: string;
}

export interface RotateRefreshTokenInput {
  currentToken: string;
  expectedUserId: string;
  nextExpiresAt: Date;
  nextToken: string;
}

export interface AuthService {
  login(input: LoginBody): Promise<AuthUser>;
  logout(refreshToken: string): Promise<void>;
  register(input: RegisterBody): Promise<AuthUser>;
  rotateRefreshToken(input: RotateRefreshTokenInput): Promise<AuthUser>;
  storeRefreshToken(input: StoreRefreshTokenInput): Promise<void>;
}

export class PostgresAuthService implements AuthService {
  private static readonly UNIQUE_VIOLATION_CODE = "23505";

  constructor(private readonly pool: Pool) {}

  async register(input: RegisterBody) {
    const id = randomUUID();
    const email = normalizeEmail(input.email);
    const name = input.name.trim();
    const passwordHash = await hashPassword(input.password);

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

  async login(input: LoginBody) {
    const email = normalizeEmail(input.email);
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

    const isValidPassword = await verifyPassword(input.password, user.password_hash);

    if (!isValidPassword) {
      throw invalidCredentialsError();
    }

    return mapAuthUser(user);
  }

  async storeRefreshToken(input: StoreRefreshTokenInput) {
    await this.pool.query(
      `
        INSERT INTO refresh_tokens (id, token, user_id, expires_at)
        VALUES ($1, $2, $3, $4)
      `,
      [randomUUID(), input.token, input.userId, input.expiresAt],
    );
  }

  async rotateRefreshToken(input: RotateRefreshTokenInput) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const session = await getRefreshTokenSession(client, input.currentToken);

      if (!session || session.userId !== input.expectedUserId || isExpired(session.expiresAt)) {
        throw invalidRefreshTokenError();
      }

      const user = await getUserById(client, session.userId);

      if (!user) {
        throw invalidRefreshTokenError();
      }

      await client.query(
        `
          DELETE FROM refresh_tokens
          WHERE token = $1
        `,
        [input.currentToken],
      );
      await client.query(
        `
          INSERT INTO refresh_tokens (id, token, user_id, expires_at)
          VALUES ($1, $2, $3, $4)
        `,
        [randomUUID(), input.nextToken, session.userId, input.nextExpiresAt],
      );

      await client.query("COMMIT");
      return user;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async logout(refreshToken: string) {
    await this.pool.query(
      `
        DELETE FROM refresh_tokens
        WHERE token = $1
      `,
      [refreshToken],
    );
  }
}

async function getRefreshTokenSession(client: PoolClient, token: string) {
  const result = await client.query<RefreshTokenRow>(
    `
      SELECT user_id, expires_at
      FROM refresh_tokens
      WHERE token = $1
      LIMIT 1
    `,
    [token],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    expiresAt: toDate(row.expires_at),
    userId: row.user_id,
  };
}

async function getUserById(client: PoolClient, userId: string) {
  const result = await client.query<AuthUser>(
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

function mapAuthUser(user: Pick<UserRow, "email" | "id" | "name">): AuthUser {
  return {
    email: user.email,
    id: user.id,
    name: user.name,
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function invalidCredentialsError() {
  return new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
}

function invalidRefreshTokenError() {
  return new AppError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token");
}

function isExpired(expiresAt: Date) {
  return expiresAt.getTime() <= Date.now();
}

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function isDatabaseError(
  error: unknown,
): error is {
  code?: string;
} {
  return typeof error === "object" && error !== null && "code" in error;
}
