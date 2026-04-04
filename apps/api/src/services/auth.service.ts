import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { schema } from '../db/index.js';
import { AppError } from './errors.js';

const SALT_ROUNDS = 12;

export async function registerUser(
  db: Database,
  data: { email: string; name: string; password: string },
) {
  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, data.email))
    .limit(1);

  if (existing.length > 0) {
    throw new AppError('EMAIL_TAKEN', 409, 'Email is already in use.');
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  const [user] = await db
    .insert(schema.users)
    .values({ email: data.email, name: data.name, passwordHash })
    .returning({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      avatar: schema.users.avatar,
      createdAt: schema.users.createdAt,
    });
  return user;
}

export async function loginUser(
  db: Database,
  data: { email: string; password: string },
) {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, data.email))
    .limit(1);

  if (!user) {
    throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid email or password.');
  }

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) {
    throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid email or password.');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    createdAt: user.createdAt,
  };
}
