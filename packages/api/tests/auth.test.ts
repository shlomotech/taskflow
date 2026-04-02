/**
 * Auth endpoint integration tests — SHL-183
 *
 * Tests POST /api/v1/auth/register, /login, /refresh, /logout.
 *
 * Setup expectations:
 *   - buildApp(opts) exported from '../src/app.js' accepts optional { db: pg.Pool, logger: boolean }
 *   - DATABASE_URL env var points to a dedicated test Postgres DB
 *   - Prisma tables: "User" and "RefreshToken" (Prisma capitalised table names)
 *
 * Run: pnpm --filter @taskflow/api test
 *      cd packages/api && npx vitest run
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import pg from 'pg'
import { buildApp } from '../src/app.js'
import type { FastifyInstance } from 'fastify'

const { Pool } = pg

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

let pool: pg.Pool
let app: FastifyInstance

beforeAll(async () => {
  pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      'postgres://taskflow:taskflow_dev@localhost:5432/taskflow_test',
  })
  app = await buildApp({ db: pool, logger: false })
  await app.ready()
})

afterAll(async () => {
  await app.close()
  await pool.end()
})

beforeEach(async () => {
  // Cascade order: RefreshToken references User, so delete tokens first
  await pool.query('DELETE FROM "RefreshToken"')
  await pool.query('DELETE FROM "User"')
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_USER = {
  email: 'alice@example.com',
  name: 'Alice',
  password: 'password123',
}

async function register(overrides: Partial<typeof VALID_USER> = {}) {
  return app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { ...VALID_USER, ...overrides },
  })
}

/**
 * Extract the raw value of the refreshToken HttpOnly cookie from a response.
 * Returns undefined if the header is absent or the cookie is not present.
 */
function getRefreshCookie(
  res: Awaited<ReturnType<FastifyInstance['inject']>>,
): string | undefined {
  const setCookie = res.headers['set-cookie']
  if (!setCookie) return undefined
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie]
  const found = cookies.find((c) => c.startsWith('refreshToken='))
  if (!found) return undefined
  // "refreshToken=<value>; Path=/; HttpOnly; ..."  →  "<value>"
  return found.split(';')[0].split('=').slice(1).join('=')
}

// ---------------------------------------------------------------------------
// POST /api/v1/auth/register
// ---------------------------------------------------------------------------

describe('POST /api/v1/auth/register', () => {
  it('returns 201, accessToken in body, and HttpOnly refreshToken cookie on success', async () => {
    const res = await register()

    expect(res.statusCode).toBe(201)
    const body = res.json<{ accessToken: string }>()
    expect(typeof body.accessToken).toBe('string')
    expect(body.accessToken.length).toBeGreaterThan(0)

    // Verify HttpOnly refresh-token cookie is set
    const setCookie = res.headers['set-cookie']
    expect(setCookie).toBeDefined()
    const cookieStr = Array.isArray(setCookie) ? setCookie.join('; ') : (setCookie as string)
    expect(cookieStr).toMatch(/refreshToken=/)
    expect(cookieStr.toLowerCase()).toMatch(/httponly/)
  })

  it('returns 409 when the email is already registered', async () => {
    await register()
    const res = await register({ password: 'differentpass123' })
    expect(res.statusCode).toBe(409)
  })

  it('returns 400 when email field is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { name: 'Bob', password: 'password123' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when name field is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'bob@example.com', password: 'password123' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when password is shorter than 8 characters', async () => {
    const res = await register({ password: 'short' })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when email is not a valid address', async () => {
    const res = await register({ email: 'not-an-email' })
    expect(res.statusCode).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// POST /api/v1/auth/login
// ---------------------------------------------------------------------------

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    // Seed a registered user before each login test
    await register()
  })

  it('returns 200, accessToken in body, and HttpOnly refreshToken cookie on valid credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: VALID_USER.email, password: VALID_USER.password },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ accessToken: string }>()
    expect(typeof body.accessToken).toBe('string')
    expect(body.accessToken.length).toBeGreaterThan(0)

    const setCookie = res.headers['set-cookie']
    expect(setCookie).toBeDefined()
    const cookieStr = Array.isArray(setCookie) ? setCookie.join('; ') : (setCookie as string)
    expect(cookieStr).toMatch(/refreshToken=/)
    expect(cookieStr.toLowerCase()).toMatch(/httponly/)
  })

  it('returns 401 when the password is wrong', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: VALID_USER.email, password: 'wrongpassword' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 when the email is not registered', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'unknown@example.com', password: VALID_USER.password },
    })
    expect(res.statusCode).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// POST /api/v1/auth/refresh
// ---------------------------------------------------------------------------

describe('POST /api/v1/auth/refresh', () => {
  let refreshCookie: string

  beforeEach(async () => {
    const res = await register()
    const token = getRefreshCookie(res)
    expect(token, 'register should set refreshToken cookie').toBeDefined()
    refreshCookie = token!
  })

  it('returns 200 with new accessToken and rotates the refresh cookie', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      cookies: { refreshToken: refreshCookie },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ accessToken: string }>()
    expect(typeof body.accessToken).toBe('string')
    expect(body.accessToken.length).toBeGreaterThan(0)

    // New refresh cookie must be issued (token rotation)
    const newToken = getRefreshCookie(res)
    expect(newToken).toBeDefined()
    expect(newToken).not.toBe(refreshCookie)
  })

  it('returns 401 when no cookie is provided', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 for an invalid/tampered cookie value', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      cookies: { refreshToken: 'not.a.valid.jwt.token' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 for a well-formed JWT signed with the wrong secret', async () => {
    // HS256 JWT signed with a different secret — signature will not verify
    const wrongSecretToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
      '.eyJzdWIiOiJ1c2VyLTEiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjo5OTk5OTk5OTk5fQ' +
      '.INVALIDSIGNATUREHERE_xxxxxxxxxxxxxxxxxxx'

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      cookies: { refreshToken: wrongSecretToken },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 after reusing the same refresh token (token rotation enforcement)', async () => {
    // First use — should succeed and invalidate the token
    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      cookies: { refreshToken: refreshCookie },
    })
    expect(first.statusCode).toBe(200)

    // Second use of the same (now-rotated-out) token — must be rejected
    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      cookies: { refreshToken: refreshCookie },
    })
    expect(second.statusCode).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// POST /api/v1/auth/logout
// ---------------------------------------------------------------------------

describe('POST /api/v1/auth/logout', () => {
  let refreshCookie: string

  beforeEach(async () => {
    const res = await register()
    const token = getRefreshCookie(res)
    expect(token, 'register should set refreshToken cookie').toBeDefined()
    refreshCookie = token!
  })

  it('returns 204 and clears the refresh token cookie', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      cookies: { refreshToken: refreshCookie },
    })

    expect(res.statusCode).toBe(204)

    // Cookie should be cleared (Max-Age=0 or Expires in the past)
    const setCookie = res.headers['set-cookie']
    expect(setCookie).toBeDefined()
    const cookieStr = Array.isArray(setCookie) ? setCookie.join('; ') : (setCookie as string)
    const isCleared =
      /max-age=0/i.test(cookieStr) || /expires=.*(?:1970|thu, 01 jan)/i.test(cookieStr)
    expect(isCleared, 'refreshToken cookie should be cleared after logout').toBe(true)
  })

  it('invalidates the refresh token so subsequent /refresh calls return 401', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      cookies: { refreshToken: refreshCookie },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      cookies: { refreshToken: refreshCookie },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 204 even when no refresh cookie is provided (idempotent)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
    })
    expect(res.statusCode).toBe(204)
  })
})
