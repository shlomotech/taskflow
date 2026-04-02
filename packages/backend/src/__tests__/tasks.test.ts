/**
 * Integration tests for task CRUD endpoints.
 *
 * Assumes `buildApp({ db })` factory exported from `../app.js`.
 * Routes expected under `/projects/:projectId/tasks` or `/tasks`.
 * All mutating routes require `Authorization: Bearer <accessToken>`.
 *
 * Task status values: 'todo' | 'in_progress' | 'done' | 'cancelled'
 * Task priority values: 'low' | 'medium' | 'high' | 'critical'
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
  await pool.query('DELETE FROM comments')
  await pool.query('DELETE FROM tasks')
  await pool.query('DELETE FROM projects')
  await pool.query('DELETE FROM users')
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'
type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

interface TaskPayload {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: string
}

async function seedProject(token: string, name = 'Test Project'): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/projects',
    headers: { authorization: bearer(token) },
    payload: { name },
  })
  return res.json<{ id: string }>().id
}

async function createTask(
  token: string,
  projectId: string,
  overrides: TaskPayload = {},
): Promise<ReturnType<FastifyInstance['inject']>> {
  return app.inject({
    method: 'POST',
    url: `/projects/${projectId}/tasks`,
    headers: { authorization: bearer(token) },
    payload: {
      title: 'Sample Task',
      status: 'todo',
      priority: 'medium',
      ...overrides,
    },
  })
}

// ---------------------------------------------------------------------------
// POST /projects/:projectId/tasks
// ---------------------------------------------------------------------------

describe('POST /projects/:projectId/tasks', () => {
  let user: TestUser
  let projectId: string

  beforeEach(async () => {
    user = await createTestUser(app)
    projectId = await seedProject(user.accessToken)
  })

  it('returns 201 with the created task', async () => {
    const res = await createTask(user.accessToken, projectId, { title: 'Build login page' })

    expect(res.statusCode).toBe(201)
    const body = res.json<{ id: string; title: string; status: string; projectId: string }>()
    expect(body.title).toBe('Build login page')
    expect(body.status).toBe('todo')
    expect(body.projectId).toBe(projectId)
  })

  it('returns 401 when no auth token is provided', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/projects/${projectId}/tasks`,
      payload: { title: 'Unauthenticated' },
    })

    expect(res.statusCode).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// GET /projects/:projectId/tasks
// ---------------------------------------------------------------------------

describe('GET /projects/:projectId/tasks', () => {
  let user: TestUser
  let projectId: string

  beforeEach(async () => {
    user = await createTestUser(app)
    projectId = await seedProject(user.accessToken)
    await createTask(user.accessToken, projectId, { title: 'T1', status: 'todo' })
    await createTask(user.accessToken, projectId, { title: 'T2', status: 'in_progress' })
    await createTask(user.accessToken, projectId, { title: 'T3', status: 'done' })
  })

  it('returns 200 with all tasks for the project', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/projects/${projectId}/tasks`,
      headers: { authorization: bearer(user.accessToken) },
    })

    expect(res.statusCode).toBe(200)
    const tasks = res.json<unknown[]>()
    const list = Array.isArray(tasks) ? tasks : (tasks as { data: unknown[] }).data
    expect(list.length).toBe(3)
  })

  it('returns only tasks matching the status filter', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/projects/${projectId}/tasks?status=todo`,
      headers: { authorization: bearer(user.accessToken) },
    })

    expect(res.statusCode).toBe(200)
    const tasks = res.json<unknown[]>()
    const list = Array.isArray(tasks) ? tasks : (tasks as { data: unknown[] }).data
    expect(list.every((t) => (t as { status: string }).status === 'todo')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// GET /projects/:projectId/tasks/:taskId
// ---------------------------------------------------------------------------

describe('GET /projects/:projectId/tasks/:taskId', () => {
  let user: TestUser
  let projectId: string
  let taskId: string

  beforeEach(async () => {
    user = await createTestUser(app)
    projectId = await seedProject(user.accessToken)
    const res = await createTask(user.accessToken, projectId)
    taskId = res.json<{ id: string }>().id
  })

  it('returns 200 with the task', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/projects/${projectId}/tasks/${taskId}`,
      headers: { authorization: bearer(user.accessToken) },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json<{ id: string }>().id).toBe(taskId)
  })

  it('returns 404 for a non-existent task id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/projects/${projectId}/tasks/00000000-0000-0000-0000-000000000000`,
      headers: { authorization: bearer(user.accessToken) },
    })

    expect(res.statusCode).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// PATCH /projects/:projectId/tasks/:taskId
// ---------------------------------------------------------------------------

describe('PATCH /projects/:projectId/tasks/:taskId', () => {
  let user: TestUser
  let projectId: string
  let taskId: string

  beforeEach(async () => {
    user = await createTestUser(app)
    projectId = await seedProject(user.accessToken)
    const res = await createTask(user.accessToken, projectId)
    taskId = res.json<{ id: string }>().id
  })

  it('returns 200 with the updated task', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/projects/${projectId}/tasks/${taskId}`,
      headers: { authorization: bearer(user.accessToken) },
      payload: { title: 'Updated title', priority: 'high' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ title: string; priority: string }>()
    expect(body.title).toBe('Updated title')
    expect(body.priority).toBe('high')
  })

  it('advances status from todo → in_progress → done', async () => {
    const transitions: TaskStatus[] = ['in_progress', 'done']
    for (const status of transitions) {
      const res = await app.inject({
        method: 'PATCH',
        url: `/projects/${projectId}/tasks/${taskId}`,
        headers: { authorization: bearer(user.accessToken) },
        payload: { status },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json<{ status: string }>().status).toBe(status)
    }
  })

  it('returns 400 for an invalid status value', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/projects/${projectId}/tasks/${taskId}`,
      headers: { authorization: bearer(user.accessToken) },
      payload: { status: 'not_a_real_status' },
    })

    expect(res.statusCode).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// DELETE /projects/:projectId/tasks/:taskId
// ---------------------------------------------------------------------------

describe('DELETE /projects/:projectId/tasks/:taskId', () => {
  let user: TestUser
  let projectId: string
  let taskId: string

  beforeEach(async () => {
    user = await createTestUser(app)
    projectId = await seedProject(user.accessToken)
    const res = await createTask(user.accessToken, projectId)
    taskId = res.json<{ id: string }>().id
  })

  it('returns 204 when the task is deleted', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/projects/${projectId}/tasks/${taskId}`,
      headers: { authorization: bearer(user.accessToken) },
    })

    expect(res.statusCode).toBe(204)
  })

  it('returns 404 after the task has been deleted', async () => {
    await app.inject({
      method: 'DELETE',
      url: `/projects/${projectId}/tasks/${taskId}`,
      headers: { authorization: bearer(user.accessToken) },
    })

    const res = await app.inject({
      method: 'GET',
      url: `/projects/${projectId}/tasks/${taskId}`,
      headers: { authorization: bearer(user.accessToken) },
    })

    expect(res.statusCode).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// Kanban position ordering
// ---------------------------------------------------------------------------

describe('Kanban position ordering', () => {
  let user: TestUser
  let projectId: string

  beforeEach(async () => {
    user = await createTestUser(app)
    projectId = await seedProject(user.accessToken)
  })

  it('assigns distinct kanban positions to tasks in the same column', async () => {
    const res1 = await createTask(user.accessToken, projectId, { title: 'Card 1', status: 'todo' })
    const res2 = await createTask(user.accessToken, projectId, { title: 'Card 2', status: 'todo' })

    const pos1 = res1.json<{ position: number }>().position
    const pos2 = res2.json<{ position: number }>().position

    expect(typeof pos1).toBe('number')
    expect(typeof pos2).toBe('number')
    expect(pos1).not.toBe(pos2)
  })

  it('moves a task to a new column when status changes', async () => {
    const createRes = await createTask(user.accessToken, projectId, { status: 'todo' })
    const taskId = createRes.json<{ id: string }>().id

    const moveRes = await app.inject({
      method: 'PATCH',
      url: `/projects/${projectId}/tasks/${taskId}`,
      headers: { authorization: bearer(user.accessToken) },
      payload: { status: 'in_progress', position: 0 },
    })

    expect(moveRes.statusCode).toBe(200)
    expect(moveRes.json<{ status: string }>().status).toBe('in_progress')
  })
})
