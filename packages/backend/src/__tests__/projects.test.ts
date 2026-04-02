/**
 * Integration tests for project CRUD endpoints.
 *
 * Assumes `buildApp({ db })` factory exported from `../app.js`.
 * Routes expected under `/projects`.
 * All mutating routes require `Authorization: Bearer <accessToken>`.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import pg from 'pg'
import { buildApp } from '../app.js'
import { createTestUser, bearer, type TestUser } from './helpers/auth.js'
import type { FastifyInstance } from 'fastify'

const { Pool } = pg

let pool: pg.Pool
let app: FastifyInstance

beforeAll(async () => {
  pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ?? 'postgres://taskflow:taskflow_dev@localhost:5432/taskflow',
  })
  app = await buildApp({ db: pool })
  await app.ready()
})

afterAll(async () => {
  await app.close()
  await pool.end()
})

beforeEach(async () => {
  // Clean up in dependency order
  await pool.query('DELETE FROM project_members')
  await pool.query('DELETE FROM projects')
  await pool.query('DELETE FROM users')
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createProject(
  token: string,
  overrides: { name?: string; description?: string } = {},
): Promise<ReturnType<FastifyInstance['inject']>> {
  return app.inject({
    method: 'POST',
    url: '/projects',
    headers: { authorization: bearer(token) },
    payload: {
      name: 'My Project',
      description: 'Test project',
      ...overrides,
    },
  })
}

// ---------------------------------------------------------------------------
// POST /projects
// ---------------------------------------------------------------------------

describe('POST /projects', () => {
  let user: TestUser

  beforeEach(async () => {
    user = await createTestUser(app)
  })

  it('returns 201 with the created project', async () => {
    const res = await createProject(user.accessToken, { name: 'Alpha' })

    expect(res.statusCode).toBe(201)
    const body = res.json<{ id: string; name: string; ownerId: string }>()
    expect(body.name).toBe('Alpha')
    expect(body.ownerId).toBe(user.userId)
    expect(typeof body.id).toBe('string')
  })

  it('returns 401 when no auth token is provided', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/projects',
      payload: { name: 'No Auth' },
    })

    expect(res.statusCode).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// GET /projects
// ---------------------------------------------------------------------------

describe('GET /projects', () => {
  let user: TestUser

  beforeEach(async () => {
    user = await createTestUser(app)
  })

  it('returns 200 with an array of the user\'s projects', async () => {
    await createProject(user.accessToken, { name: 'P1' })
    await createProject(user.accessToken, { name: 'P2' })

    const res = await app.inject({
      method: 'GET',
      url: '/projects',
      headers: { authorization: bearer(user.accessToken) },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: unknown[] }>()
    // Support both `{ data: [...] }` and `[...]` response shapes
    const projects = Array.isArray(body) ? body : body.data
    expect(projects.length).toBeGreaterThanOrEqual(2)
  })

  it('returns 401 when no auth token is provided', async () => {
    const res = await app.inject({ method: 'GET', url: '/projects' })

    expect(res.statusCode).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// GET /projects/:id
// ---------------------------------------------------------------------------

describe('GET /projects/:id', () => {
  let user: TestUser
  let projectId: string

  beforeEach(async () => {
    user = await createTestUser(app)
    const res = await createProject(user.accessToken)
    projectId = res.json<{ id: string }>().id
  })

  it('returns 200 with the project', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/projects/${projectId}`,
      headers: { authorization: bearer(user.accessToken) },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ id: string }>()
    expect(body.id).toBe(projectId)
  })

  it('returns 404 for a non-existent project id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/projects/00000000-0000-0000-0000-000000000000',
      headers: { authorization: bearer(user.accessToken) },
    })

    expect(res.statusCode).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// PATCH /projects/:id
// ---------------------------------------------------------------------------

describe('PATCH /projects/:id', () => {
  let owner: TestUser
  let otherUser: TestUser
  let projectId: string

  beforeEach(async () => {
    owner = await createTestUser(app)
    otherUser = await createTestUser(app)
    const res = await createProject(owner.accessToken)
    projectId = res.json<{ id: string }>().id
  })

  it('returns 200 with updated project when called by owner', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/projects/${projectId}`,
      headers: { authorization: bearer(owner.accessToken) },
      payload: { name: 'Renamed Project' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ name: string }>()
    expect(body.name).toBe('Renamed Project')
  })

  it('returns 403 when a non-owner tries to update the project', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/projects/${projectId}`,
      headers: { authorization: bearer(otherUser.accessToken) },
      payload: { name: 'Hijacked' },
    })

    expect(res.statusCode).toBe(403)
  })
})

// ---------------------------------------------------------------------------
// DELETE /projects/:id
// ---------------------------------------------------------------------------

describe('DELETE /projects/:id', () => {
  let owner: TestUser
  let otherUser: TestUser
  let projectId: string

  beforeEach(async () => {
    owner = await createTestUser(app)
    otherUser = await createTestUser(app)
    const res = await createProject(owner.accessToken)
    projectId = res.json<{ id: string }>().id
  })

  it('returns 204 when owner deletes the project', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/projects/${projectId}`,
      headers: { authorization: bearer(owner.accessToken) },
    })

    expect(res.statusCode).toBe(204)
  })

  it('returns 403 when a non-owner tries to delete the project', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/projects/${projectId}`,
      headers: { authorization: bearer(otherUser.accessToken) },
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 404 after the project has been deleted', async () => {
    await app.inject({
      method: 'DELETE',
      url: `/projects/${projectId}`,
      headers: { authorization: bearer(owner.accessToken) },
    })

    const res = await app.inject({
      method: 'GET',
      url: `/projects/${projectId}`,
      headers: { authorization: bearer(owner.accessToken) },
    })

    expect(res.statusCode).toBe(404)
  })
})
