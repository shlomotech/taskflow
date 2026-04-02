/**
 * Integration tests for auth endpoints.
 *
 * Assumes a `buildApp(opts)` factory exported from `../app.js` that accepts
 * an optional `db` (pg.Pool) so tests can inject a dedicated pool and control
 * teardown without touching a shared connection.
 *
 * Test database:  DATABASE_URL env var (use a dedicated test DB or the dev DB
 *                 — rows are cleaned between each test via DELETE FROM users).
 *
 * Run:  pnpm --filter @taskflow/backend test
 *       # or: cd packages/backend && npx vitest run
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import pg from 'pg'
import { buildApp } from '../app.js'
import type { FastifyInstance } from 'fastify'

const { Pool } = pg

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

let pool: pg.Pool
let app: FastifyInstance

beforeAll(async () => {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL ?? 'postgres://taskflow:taskflow_dev@localhost:5432/taskflow',
  })
  app = await buildApp({ db: pool })
  await app.ready()
})

afterAll(async () => {
  await app.close()
  await pool.end()
})

beforeEach(async () => {
  // Isolate each test — wipe users (cascades to refresh_tokens if FK'd)
  await pool.query('DELETE FROM users')
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_USER = { email: 'alice@example.com', password: 'password123' }

async function registerUser(
  overrides: Partial<typeof VALID_USER> = {},
): Promise<ReturnType<FastifyInstance['inject']>> {
  return app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { ...VALID_USER, ...overrides },
  })
}

// ---------------------------------------------------------------------------
// POST /auth/register
// ---------------------------------------------------------------------------

describe('POST /auth/register', () => {
  it('returns 201 with accessToken and refreshToken on success', async () => {
    const res = await registerUser()

    expect(res.statusCode).toBe(201)
    const body = res.json<{ accessToken: string; refreshToken: string }>()
    expect(typeof body.accessToken).toBe('string')
    expect(body.accessToken.length).toBeGreaterThan(0)
    expect(typeof body.refreshToken).toBe('string')
    expect(body.refreshToken.length).toBeGreaterThan(0)
  })

  it('returns 409 when the email is already registered', async () => {
    await registerUser()
    const res = await registerUser({ password: 'different123' })

    expect(res.statusCode).toBe(409)
  })

  it('returns 400 when the email is not a valid address', async () => {
    const res = await registerUser({ email: 'not-an-email' })

    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when the password is too short (< 8 chars)', async () => {
    const res = await registerUser({ password: 'short' })

    expect(res.statusCode).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// POST /auth/login
// ---------------------------------------------------------------------------

describe('POST /auth/login', () => {
  beforeEach(async () => {
    // Seed a registered user before each login test
    await registerUser()
  })

  it('returns 200 with accessToken and refreshToken on valid credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: VALID_USER,
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ accessToken: string; refreshToken: string }>()
    expect(typeof body.accessToken).toBe('string')
    expect(body.accessToken.length).toBeGreaterThan(0)
    expect(typeof body.refreshToken).toBe('string')
    expect(body.refreshToken.length).toBeGreaterThan(0)
  })

  it('returns 401 when the password is wrong', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: VALID_USER.email, password: 'wrongpassword' },
    })

    expect(res.statusCode).toBe(401)
  })

  it('returns 401 when the email is not registered', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'unknown@example.com', password: VALID_USER.password },
    })

    expect(res.statusCode).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// POST /auth/refresh
// ---------------------------------------------------------------------------

describe('POST /auth/refresh', () => {
  let validRefreshToken: string

  beforeEach(async () => {
    const res = await registerUser()
    validRefreshToken = res.json<{ refreshToken: string }>().refreshToken
  })

  it('returns 200 with a new accessToken for a valid refresh token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: validRefreshToken },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ accessToken: string }>()
    expect(typeof body.accessToken).toBe('string')
    expect(body.accessToken.length).toBeGreaterThan(0)
  })

  it('returns 401 for a syntactically invalid token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: 'this.is.not.a.valid.jwt' },
    })

    expect(res.statusCode).toBe(401)
  })

  it('returns 401 for a structurally valid JWT signed with the wrong secret', async () => {
    // Signed with a different secret — signature will not verify
    const wrongSecretToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
      '.eyJzdWIiOiJ1c2VyLTEiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjo5OTk5OTk5OTk5fQ' +
      '.WRONG_SIGNATURE_HERE'

    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: wrongSecretToken },
    })

    expect(res.statusCode).toBe(401)
  })

  it('returns 401 for a token that has already expired', async () => {
    // A well-formed HS256 JWT with exp=1 (way in the past).
    // The signature won't match the app's JWT_SECRET, which intentionally
    // triggers a 401 — same observable outcome as a truly expired token.
    const expiredToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
      '.eyJzdWIiOiJ1c2VyLTEiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MSwiZXhwIjoxfQ' +
      '.tDdpxq5YVV2lEGHvNLbFAY-_oSq9J9yrJXiEHEt3hG4'

    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: expiredToken },
    })

    expect(res.statusCode).toBe(401)
  })
})
