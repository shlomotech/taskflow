/**
 * Shared test helper: register a user and return the auth tokens.
 *
 * Usage:
 *   const { accessToken } = await createTestUser(app)
 *   const { accessToken, userId } = await createTestUser(app, { email: 'bob@example.com' })
 */

import type { FastifyInstance } from 'fastify'

export interface TestUser {
  userId: string
  email: string
  accessToken: string
  refreshToken: string
}

let counter = 0

export async function createTestUser(
  app: FastifyInstance,
  overrides: { email?: string; password?: string } = {},
): Promise<TestUser> {
  counter += 1
  const email = overrides.email ?? `test-user-${counter}-${Date.now()}@example.com`
  const password = overrides.password ?? 'password123'

  const res = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email, password },
  })

  if (res.statusCode !== 201) {
    throw new Error(`createTestUser: expected 201, got ${res.statusCode} — ${res.body}`)
  }

  const body = res.json<{ userId: string; accessToken: string; refreshToken: string }>()
  return { userId: body.userId, email, accessToken: body.accessToken, refreshToken: body.refreshToken }
}

/** Returns an `Authorization` header value for inject calls */
export function bearer(token: string): string {
  return `Bearer ${token}`
}
