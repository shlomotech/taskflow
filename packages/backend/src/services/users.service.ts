import type { Pool } from "pg";
import { AppError } from "../lib/errors.js";
import type { UpdateCurrentUserBody } from "../schemas/users.js";

interface UserRow {
  avatar: string | null;
  created_at: Date | string;
  email: string;
  id: string;
  name: string;
}

export interface CurrentUser {
  avatar: string | null;
  createdAt: string;
  email: string;
  id: string;
  name: string;
}

export interface UsersService {
  getCurrentUser(userId: string): Promise<CurrentUser>;
  updateCurrentUser(
    userId: string,
    input: UpdateCurrentUserBody,
  ): Promise<CurrentUser>;
}

export class PostgresUsersService implements UsersService {
  constructor(private readonly pool: Pool) {}

  async getCurrentUser(userId: string) {
    const result = await this.pool.query<UserRow>(
      `
        SELECT id, email, name, avatar, created_at
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [userId],
    );

    return mapCurrentUser(result.rows[0] ?? null);
  }

  async updateCurrentUser(userId: string, input: UpdateCurrentUserBody) {
    const updates: string[] = [];
    const values: Array<string | null> = [userId];
    let parameterIndex = 2;

    if (input.name !== undefined) {
      updates.push(`name = $${parameterIndex}`);
      values.push(input.name);
      parameterIndex += 1;
    }

    if (input.avatar !== undefined) {
      updates.push(`avatar = $${parameterIndex}`);
      values.push(input.avatar);
      parameterIndex += 1;
    }

    const result = await this.pool.query<UserRow>(
      `
        UPDATE users
        SET ${updates.join(", ")}, updated_at = NOW()
        WHERE id = $1
        RETURNING id, email, name, avatar, created_at
      `,
      values,
    );

    return mapCurrentUser(result.rows[0] ?? null);
  }
}

function mapCurrentUser(user: UserRow | null): CurrentUser {
  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }

  return {
    avatar: user.avatar,
    createdAt: toDate(user.created_at).toISOString(),
    email: user.email,
    id: user.id,
    name: user.name,
  };
}

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}
