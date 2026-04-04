import { eq } from 'drizzle-orm';
import type { Database } from '../db/index.js';
import { schema } from '../db/index.js';
import { AppError } from './errors.js';

const publicFields = {
  id: schema.users.id,
  email: schema.users.email,
  name: schema.users.name,
  avatar: schema.users.avatar,
  createdAt: schema.users.createdAt,
};

export async function listUsers(db: Database) {
  return db.select(publicFields).from(schema.users);
}

export async function getUser(db: Database, userId: string) {
  const [user] = await db
    .select(publicFields)
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  if (!user) throw new AppError('NOT_FOUND', 404, 'User not found.');
  return user;
}

export async function updateUser(
  db: Database,
  userId: string,
  data: { name?: string; avatar?: string },
) {
  const [user] = await db
    .update(schema.users)
    .set(data)
    .where(eq(schema.users.id, userId))
    .returning(publicFields);
  if (!user) throw new AppError('NOT_FOUND', 404, 'User not found.');
  return user;
}
