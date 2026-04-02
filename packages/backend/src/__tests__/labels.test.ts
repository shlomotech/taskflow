/**
 * Integration tests for label endpoints.
 *
 * Routes expected:
 *   POST   /labels                               — create label
 *   GET    /labels                               — list labels
 *   PATCH  /labels/:labelId                      — update label
 *   DELETE /labels/:labelId                      — delete label
 *   POST   /projects/:projectId/tasks/:taskId/labels/:labelId   — add label to task
 *   DELETE /projects/:projectId/tasks/:taskId/labels/:labelId   — remove label from task
 *   GET    /projects/:projectId/tasks/:taskId    — label ids/objects included in response
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
  await pool.query('DELETE FROM task_labels')
  await pool.query('DELETE FROM labels')
  await pool.query('DELETE FROM tasks')
  await pool.query('DELETE FROM projects')
  await pool.query('DELETE FROM users')
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createLabel(
  token: string,
  overrides: { name?: string; color?: string } = {},
): Promise<ReturnType<FastifyInstance['inject']>> {
  return app.inject({
    method: 'POST',
    url: '/labels',
    headers: { authorization: bearer(token) },
    payload: { name: 'Bug', color: '#ff0000', ...overrides },
  })
}

async function seedProjectAndTask(token: string): Promise<{ projectId: string; taskId: string }> {
  const pRes = await app.inject({
    method: 'POST',
    url: '/projects',
    headers: { authorization: bearer(token) },
    payload: { name: 'Label Test Project' },
  })
  const projectId = pRes.json<{ id: string }>().id

  const tRes = await app.inject({
    method: 'POST',
    url: `/projects/${projectId}/tasks`,
    headers: { authorization: bearer(token) },
    payload: { title: 'Task for label tests', status: 'todo', priority: 'medium' },
  })
  const taskId = tRes.json<{ id: string }>().id

  return { projectId, taskId }
}

// ---------------------------------------------------------------------------
// POST /labels
// ---------------------------------------------------------------------------

describe('POST /labels', () => {
  let user: TestUser

  beforeEach(async () => {
    user = await createTestUser(app)
  })

  it('returns 201 with the created label', async () => {
    const res = await createLabel(user.accessToken, { name: 'Feature', color: '#00ff00' })

    expect(res.statusCode).toBe(201)
    const body = res.json<{ id: string; name: string; color: string }>()
    expect(body.name).toBe('Feature')
    expect(body.color).toBe('#00ff00')
    expect(typeof body.id).toBe('string')
  })

  it('returns 401 when no auth token is provided', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/labels',
      payload: { name: 'No auth', color: '#000' },
    })

    expect(res.statusCode).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// GET /labels
// ---------------------------------------------------------------------------

describe('GET /labels', () => {
  let user: TestUser

  beforeEach(async () => {
    user = await createTestUser(app)
    await createLabel(user.accessToken, { name: 'Bug' })
    await createLabel(user.accessToken, { name: 'Enhancement' })
  })

  it('returns 200 with all labels', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/labels',
      headers: { authorization: bearer(user.accessToken) },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<unknown[]>()
    const labels = Array.isArray(body) ? body : (body as { data: unknown[] }).data
    expect(labels.length).toBeGreaterThanOrEqual(2)
  })

  it('returns 401 when no auth token is provided', async () => {
    const res = await app.inject({ method: 'GET', url: '/labels' })

    expect(res.statusCode).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// PATCH /labels/:labelId
// ---------------------------------------------------------------------------

describe('PATCH /labels/:labelId', () => {
  let user: TestUser
  let labelId: string

  beforeEach(async () => {
    user = await createTestUser(app)
    const res = await createLabel(user.accessToken, { name: 'Bug' })
    labelId = res.json<{ id: string }>().id
  })

  it('returns 200 with the updated label', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/labels/${labelId}`,
      headers: { authorization: bearer(user.accessToken) },
      payload: { name: 'Critical Bug', color: '#cc0000' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ name: string; color: string }>()
    expect(body.name).toBe('Critical Bug')
    expect(body.color).toBe('#cc0000')
  })

  it('returns 404 for a non-existent label id', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/labels/00000000-0000-0000-0000-000000000000',
      headers: { authorization: bearer(user.accessToken) },
      payload: { name: 'Ghost' },
    })

    expect(res.statusCode).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// DELETE /labels/:labelId
// ---------------------------------------------------------------------------

describe('DELETE /labels/:labelId', () => {
  let user: TestUser
  let labelId: string

  beforeEach(async () => {
    user = await createTestUser(app)
    const res = await createLabel(user.accessToken)
    labelId = res.json<{ id: string }>().id
  })

  it('returns 204 when the label is deleted', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/labels/${labelId}`,
      headers: { authorization: bearer(user.accessToken) },
    })

    expect(res.statusCode).toBe(204)
  })

  it('returns 404 for a non-existent label id', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/labels/00000000-0000-0000-0000-000000000000',
      headers: { authorization: bearer(user.accessToken) },
    })

    expect(res.statusCode).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// Add / remove label on task
// ---------------------------------------------------------------------------

describe('Task label association', () => {
  let user: TestUser
  let projectId: string
  let taskId: string
  let labelId: string

  beforeEach(async () => {
    user = await createTestUser(app)
    ;({ projectId, taskId } = await seedProjectAndTask(user.accessToken))
    const lRes = await createLabel(user.accessToken, { name: 'Sprint-1' })
    labelId = lRes.json<{ id: string }>().id
  })

  it('returns 200/204 when adding a label to a task', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/projects/${projectId}/tasks/${taskId}/labels/${labelId}`,
      headers: { authorization: bearer(user.accessToken) },
    })

    // Implementations may use 200 (with updated task) or 204 (no body)
    expect([200, 204]).toContain(res.statusCode)
  })

  it('includes attached labels in the GET task response', async () => {
    // Attach the label
    await app.inject({
      method: 'POST',
      url: `/projects/${projectId}/tasks/${taskId}/labels/${labelId}`,
      headers: { authorization: bearer(user.accessToken) },
    })

    // Fetch the task
    const res = await app.inject({
      method: 'GET',
      url: `/projects/${projectId}/tasks/${taskId}`,
      headers: { authorization: bearer(user.accessToken) },
    })

    expect(res.statusCode).toBe(200)
    const task = res.json<{ labels?: unknown[]; labelIds?: string[] }>()

    // Support both `labels: [{ id, name, ... }]` and `labelIds: [string]` shapes
    const labelFound =
      task.labels?.some(
        (l) => typeof l === 'object' && l !== null && (l as { id: string }).id === labelId,
      ) ?? task.labelIds?.includes(labelId)

    expect(labelFound).toBe(true)
  })

  it('returns 200/204 when removing a label from a task', async () => {
    // First attach
    await app.inject({
      method: 'POST',
      url: `/projects/${projectId}/tasks/${taskId}/labels/${labelId}`,
      headers: { authorization: bearer(user.accessToken) },
    })

    // Then detach
    const res = await app.inject({
      method: 'DELETE',
      url: `/projects/${projectId}/tasks/${taskId}/labels/${labelId}`,
      headers: { authorization: bearer(user.accessToken) },
    })

    expect([200, 204]).toContain(res.statusCode)
  })

  it('label is absent from task GET response after removal', async () => {
    // Attach then detach
    await app.inject({
      method: 'POST',
      url: `/projects/${projectId}/tasks/${taskId}/labels/${labelId}`,
      headers: { authorization: bearer(user.accessToken) },
    })
    await app.inject({
      method: 'DELETE',
      url: `/projects/${projectId}/tasks/${taskId}/labels/${labelId}`,
      headers: { authorization: bearer(user.accessToken) },
    })

    const res = await app.inject({
      method: 'GET',
      url: `/projects/${projectId}/tasks/${taskId}`,
      headers: { authorization: bearer(user.accessToken) },
    })

    expect(res.statusCode).toBe(200)
    const task = res.json<{ labels?: unknown[]; labelIds?: string[] }>()

    const labelFound =
      task.labels?.some(
        (l) => typeof l === 'object' && l !== null && (l as { id: string }).id === labelId,
      ) ?? task.labelIds?.includes(labelId)

    expect(labelFound).toBeFalsy()
  })
})
