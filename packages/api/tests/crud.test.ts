/**
 * CRUD endpoint integration tests — SHL-184
 *
 * Tests:
 *   - GET/PATCH /api/v1/users/me
 *   - Full CRUD /api/v1/projects (with 403 for non-owner)
 *   - Full CRUD /api/v1/projects/:projectId/tasks (list with filters, reorder)
 *   - Full CRUD /api/v1/tasks/:taskId/comments (403 for non-author)
 *   - Full CRUD /api/v1/projects/:projectId/labels (409 duplicate name)
 *   - 401 on all protected routes without access token
 *
 * Setup expectations:
 *   - buildApp(opts) exported from '../src/app.js'
 *   - DATABASE_URL env var points to a dedicated test Postgres DB
 *   - Prisma-style quoted table names: "User", "RefreshToken", "Project", "Task", "Comment", "Label", "TaskLabel"
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
  // Delete in dependency order (FK constraints)
  await pool.query('DELETE FROM "TaskLabel"')
  await pool.query('DELETE FROM "Comment"')
  await pool.query('DELETE FROM "Label"')
  await pool.query('DELETE FROM "Task"')
  await pool.query('DELETE FROM "Project"')
  await pool.query('DELETE FROM "RefreshToken"')
  await pool.query('DELETE FROM "User"')
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface AuthResult {
  accessToken: string
  userId: string
}

async function createUser(
  email: string,
  name: string,
  password = 'password123',
): Promise<AuthResult> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email, name, password },
  })
  expect(res.statusCode, `register ${email}`).toBe(201)
  const body = res.json<{ accessToken: string; user: { id: string } }>()
  return { accessToken: body.accessToken, userId: body.user.id }
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

// ---------------------------------------------------------------------------
// 401 guards — verify auth is required on all protected routes
// ---------------------------------------------------------------------------

describe('401 without access token', () => {
  it.each([
    ['GET', '/api/v1/users/me'],
    ['PATCH', '/api/v1/users/me'],
    ['GET', '/api/v1/projects'],
    ['POST', '/api/v1/projects'],
  ])('%s %s returns 401', async (method, url) => {
    const res = await app.inject({ method: method as any, url })
    expect(res.statusCode).toBe(401)
  })

  it('GET /api/v1/projects/:projectId returns 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/projects/nonexistent-id' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /api/v1/projects/:projectId/tasks returns 401', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/projects/some-id/tasks' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /api/v1/tasks/:taskId/comments returns 401', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/tasks/some-id/comments' })
    expect(res.statusCode).toBe(401)
  })

  it('POST /api/v1/projects/:projectId/labels returns 401', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/projects/some-id/labels' })
    expect(res.statusCode).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// Users — GET /api/v1/users/me  &  PATCH /api/v1/users/me
// ---------------------------------------------------------------------------

describe('GET /api/v1/users/me', () => {
  it('returns the authenticated user profile', async () => {
    const { accessToken } = await createUser('alice@example.com', 'Alice')

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: authHeader(accessToken),
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ email: string; name: string; id: string }>()
    expect(body.email).toBe('alice@example.com')
    expect(body.name).toBe('Alice')
    expect(typeof body.id).toBe('string')
    // passwordHash must never be exposed
    expect((body as any).passwordHash).toBeUndefined()
  })
})

describe('PATCH /api/v1/users/me', () => {
  it('updates the user name', async () => {
    const { accessToken } = await createUser('alice@example.com', 'Alice')

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me',
      headers: authHeader(accessToken),
      payload: { name: 'Alicia' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json<{ name: string }>().name).toBe('Alicia')
  })

  it('returns 400 for invalid payload (empty name)', async () => {
    const { accessToken } = await createUser('alice@example.com', 'Alice')

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me',
      headers: authHeader(accessToken),
      payload: { name: '' },
    })

    expect(res.statusCode).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// Projects — full CRUD + 403 for non-owner
// ---------------------------------------------------------------------------

describe('Projects CRUD', () => {
  it('POST /api/v1/projects creates a project and returns 201', async () => {
    const { accessToken } = await createUser('alice@example.com', 'Alice')

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      headers: authHeader(accessToken),
      payload: { name: 'My Project', description: 'A test project' },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json<{ id: string; name: string; ownerId: string }>()
    expect(body.name).toBe('My Project')
    expect(typeof body.id).toBe('string')
  })

  it('GET /api/v1/projects lists only the owner\'s projects', async () => {
    const alice = await createUser('alice@example.com', 'Alice')
    const bob = await createUser('bob@example.com', 'Bob')

    // Alice creates a project; Bob creates one
    await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      headers: authHeader(alice.accessToken),
      payload: { name: 'Alice Project' },
    })
    await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      headers: authHeader(bob.accessToken),
      payload: { name: 'Bob Project' },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
      headers: authHeader(alice.accessToken),
    })

    expect(res.statusCode).toBe(200)
    const projects = res.json<Array<{ name: string }>>()
    expect(projects).toHaveLength(1)
    expect(projects[0].name).toBe('Alice Project')
  })

  it('GET /api/v1/projects/:projectId returns the project', async () => {
    const { accessToken } = await createUser('alice@example.com', 'Alice')
    const created = (
      await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeader(accessToken),
        payload: { name: 'Fetch Me' },
      })
    ).json<{ id: string }>()

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${created.id}`,
      headers: authHeader(accessToken),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json<{ name: string }>().name).toBe('Fetch Me')
  })

  it('GET /api/v1/projects/:projectId returns 404 for unknown id', async () => {
    const { accessToken } = await createUser('alice@example.com', 'Alice')

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/clxxxxxxxxxxxxxxxxxxxxxx',
      headers: authHeader(accessToken),
    })

    expect(res.statusCode).toBe(404)
  })

  it('PATCH /api/v1/projects/:projectId updates the project for the owner', async () => {
    const { accessToken } = await createUser('alice@example.com', 'Alice')
    const { id } = (
      await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeader(accessToken),
        payload: { name: 'Old Name' },
      })
    ).json<{ id: string }>()

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${id}`,
      headers: authHeader(accessToken),
      payload: { name: 'New Name' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json<{ name: string }>().name).toBe('New Name')
  })

  it('PATCH /api/v1/projects/:projectId returns 403 for non-owner', async () => {
    const alice = await createUser('alice@example.com', 'Alice')
    const bob = await createUser('bob@example.com', 'Bob')

    const { id } = (
      await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeader(alice.accessToken),
        payload: { name: 'Alice Project' },
      })
    ).json<{ id: string }>()

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${id}`,
      headers: authHeader(bob.accessToken),
      payload: { name: 'Hijacked' },
    })

    expect(res.statusCode).toBe(403)
  })

  it('DELETE /api/v1/projects/:projectId deletes for owner', async () => {
    const { accessToken } = await createUser('alice@example.com', 'Alice')
    const { id } = (
      await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeader(accessToken),
        payload: { name: 'To Delete' },
      })
    ).json<{ id: string }>()

    const del = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${id}`,
      headers: authHeader(accessToken),
    })
    expect(del.statusCode).toBe(204)

    const get = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${id}`,
      headers: authHeader(accessToken),
    })
    expect(get.statusCode).toBe(404)
  })

  it('DELETE /api/v1/projects/:projectId returns 403 for non-owner', async () => {
    const alice = await createUser('alice@example.com', 'Alice')
    const bob = await createUser('bob@example.com', 'Bob')

    const { id } = (
      await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeader(alice.accessToken),
        payload: { name: 'Alice Project' },
      })
    ).json<{ id: string }>()

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${id}`,
      headers: authHeader(bob.accessToken),
    })
    expect(res.statusCode).toBe(403)
  })
})

// ---------------------------------------------------------------------------
// Tasks — list with filters, CRUD, reorder
// ---------------------------------------------------------------------------

describe('Tasks CRUD', () => {
  let accessToken: string
  let projectId: string

  beforeEach(async () => {
    ;({ accessToken } = await createUser('alice@example.com', 'Alice'))
    const proj = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      headers: authHeader(accessToken),
      payload: { name: 'Test Project' },
    })
    projectId = proj.json<{ id: string }>().id
  })

  it('POST /api/v1/projects/:projectId/tasks creates a task', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/tasks`,
      headers: authHeader(accessToken),
      payload: { title: 'First Task', status: 'todo', priority: 'high' },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json<{ id: string; title: string; status: string; priority: string }>()
    expect(body.title).toBe('First Task')
    expect(body.status).toBe('todo')
    expect(body.priority).toBe('high')
  })

  it('GET /api/v1/projects/:projectId/tasks lists all tasks', async () => {
    await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/tasks`,
      headers: authHeader(accessToken),
      payload: { title: 'Task A', status: 'todo' },
    })
    await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/tasks`,
      headers: authHeader(accessToken),
      payload: { title: 'Task B', status: 'in_progress' },
    })

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/tasks`,
      headers: authHeader(accessToken),
    })

    expect(res.statusCode).toBe(200)
    const tasks = res.json<Array<{ title: string }>>()
    expect(tasks).toHaveLength(2)
  })

  it('GET /api/v1/projects/:projectId/tasks filters by status', async () => {
    await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/tasks`,
      headers: authHeader(accessToken),
      payload: { title: 'Task A', status: 'todo' },
    })
    await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/tasks`,
      headers: authHeader(accessToken),
      payload: { title: 'Task B', status: 'done' },
    })

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/tasks?status=todo`,
      headers: authHeader(accessToken),
    })

    expect(res.statusCode).toBe(200)
    const tasks = res.json<Array<{ title: string; status: string }>>()
    expect(tasks.every((t) => t.status === 'todo')).toBe(true)
  })

  it('GET /api/v1/projects/:projectId/tasks filters by priority', async () => {
    await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/tasks`,
      headers: authHeader(accessToken),
      payload: { title: 'High', priority: 'high' },
    })
    await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/tasks`,
      headers: authHeader(accessToken),
      payload: { title: 'Low', priority: 'low' },
    })

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/tasks?priority=high`,
      headers: authHeader(accessToken),
    })

    expect(res.statusCode).toBe(200)
    const tasks = res.json<Array<{ priority: string }>>()
    expect(tasks.every((t) => t.priority === 'high')).toBe(true)
  })

  it('GET /api/v1/tasks/:taskId returns a task by ID', async () => {
    const created = (
      await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/tasks`,
        headers: authHeader(accessToken),
        payload: { title: 'Specific Task' },
      })
    ).json<{ id: string }>()

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/tasks/${created.id}`,
      headers: authHeader(accessToken),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json<{ title: string }>().title).toBe('Specific Task')
  })

  it('PATCH /api/v1/tasks/:taskId updates task fields', async () => {
    const { id } = (
      await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/tasks`,
        headers: authHeader(accessToken),
        payload: { title: 'Old Title', status: 'todo' },
      })
    ).json<{ id: string }>()

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tasks/${id}`,
      headers: authHeader(accessToken),
      payload: { title: 'New Title', status: 'in_progress' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ title: string; status: string }>()
    expect(body.title).toBe('New Title')
    expect(body.status).toBe('in_progress')
  })

  it('DELETE /api/v1/tasks/:taskId deletes a task', async () => {
    const { id } = (
      await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/tasks`,
        headers: authHeader(accessToken),
        payload: { title: 'To Delete' },
      })
    ).json<{ id: string }>()

    const del = await app.inject({
      method: 'DELETE',
      url: `/api/v1/tasks/${id}`,
      headers: authHeader(accessToken),
    })
    expect(del.statusCode).toBe(204)

    const get = await app.inject({
      method: 'GET',
      url: `/api/v1/tasks/${id}`,
      headers: authHeader(accessToken),
    })
    expect(get.statusCode).toBe(404)
  })

  it('PATCH /api/v1/projects/:projectId/tasks/reorder updates task positions', async () => {
    const taskA = (
      await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/tasks`,
        headers: authHeader(accessToken),
        payload: { title: 'Task A' },
      })
    ).json<{ id: string }>()
    const taskB = (
      await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/tasks`,
        headers: authHeader(accessToken),
        payload: { title: 'Task B' },
      })
    ).json<{ id: string }>()

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${projectId}/tasks/reorder`,
      headers: authHeader(accessToken),
      payload: {
        positions: [
          { taskId: taskA.id, position: 2.0 },
          { taskId: taskB.id, position: 1.0 },
        ],
      },
    })

    expect(res.statusCode).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// Comments — CRUD, 403 for non-author
// ---------------------------------------------------------------------------

describe('Comments CRUD', () => {
  let alice: { accessToken: string; userId: string }
  let bob: { accessToken: string; userId: string }
  let projectId: string
  let taskId: string

  beforeEach(async () => {
    alice = await createUser('alice@example.com', 'Alice')
    bob = await createUser('bob@example.com', 'Bob')

    projectId = (
      await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeader(alice.accessToken),
        payload: { name: 'Test Project' },
      })
    ).json<{ id: string }>().id

    taskId = (
      await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/tasks`,
        headers: authHeader(alice.accessToken),
        payload: { title: 'Task with comments' },
      })
    ).json<{ id: string }>().id
  })

  it('POST /api/v1/tasks/:taskId/comments creates a comment', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/tasks/${taskId}/comments`,
      headers: authHeader(alice.accessToken),
      payload: { body: 'Great progress!' },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json<{ body: string }>().body).toBe('Great progress!')
  })

  it('GET /api/v1/tasks/:taskId/comments lists comments for a task', async () => {
    await app.inject({
      method: 'POST',
      url: `/api/v1/tasks/${taskId}/comments`,
      headers: authHeader(alice.accessToken),
      payload: { body: 'First comment' },
    })
    await app.inject({
      method: 'POST',
      url: `/api/v1/tasks/${taskId}/comments`,
      headers: authHeader(bob.accessToken),
      payload: { body: 'Second comment' },
    })

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/tasks/${taskId}/comments`,
      headers: authHeader(alice.accessToken),
    })

    expect(res.statusCode).toBe(200)
    const comments = res.json<Array<{ body: string }>>()
    expect(comments).toHaveLength(2)
  })

  it('PATCH /api/v1/comments/:commentId updates comment for author', async () => {
    const { id } = (
      await app.inject({
        method: 'POST',
        url: `/api/v1/tasks/${taskId}/comments`,
        headers: authHeader(alice.accessToken),
        payload: { body: 'Old body' },
      })
    ).json<{ id: string }>()

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/comments/${id}`,
      headers: authHeader(alice.accessToken),
      payload: { body: 'Updated body' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json<{ body: string }>().body).toBe('Updated body')
  })

  it('PATCH /api/v1/comments/:commentId returns 403 for non-author', async () => {
    const { id } = (
      await app.inject({
        method: 'POST',
        url: `/api/v1/tasks/${taskId}/comments`,
        headers: authHeader(alice.accessToken),
        payload: { body: "Alice's comment" },
      })
    ).json<{ id: string }>()

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/comments/${id}`,
      headers: authHeader(bob.accessToken),
      payload: { body: 'Tampered' },
    })

    expect(res.statusCode).toBe(403)
  })

  it('DELETE /api/v1/comments/:commentId deletes for author', async () => {
    const { id } = (
      await app.inject({
        method: 'POST',
        url: `/api/v1/tasks/${taskId}/comments`,
        headers: authHeader(alice.accessToken),
        payload: { body: 'To delete' },
      })
    ).json<{ id: string }>()

    const del = await app.inject({
      method: 'DELETE',
      url: `/api/v1/comments/${id}`,
      headers: authHeader(alice.accessToken),
    })
    expect(del.statusCode).toBe(204)
  })

  it('DELETE /api/v1/comments/:commentId returns 403 for non-author', async () => {
    const { id } = (
      await app.inject({
        method: 'POST',
        url: `/api/v1/tasks/${taskId}/comments`,
        headers: authHeader(alice.accessToken),
        payload: { body: "Alice's comment" },
      })
    ).json<{ id: string }>()

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/comments/${id}`,
      headers: authHeader(bob.accessToken),
    })
    expect(res.statusCode).toBe(403)
  })
})

// ---------------------------------------------------------------------------
// Labels — CRUD, 409 on duplicate name within project
// ---------------------------------------------------------------------------

describe('Labels CRUD', () => {
  let accessToken: string
  let projectId: string

  beforeEach(async () => {
    ;({ accessToken } = await createUser('alice@example.com', 'Alice'))
    projectId = (
      await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeader(accessToken),
        payload: { name: 'Label Test Project' },
      })
    ).json<{ id: string }>().id
  })

  it('POST /api/v1/projects/:projectId/labels creates a label', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/labels`,
      headers: authHeader(accessToken),
      payload: { name: 'Bug', color: '#FF5733' },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json<{ id: string; name: string; color: string }>()
    expect(body.name).toBe('Bug')
    expect(body.color).toBe('#FF5733')
  })

  it('POST /api/v1/projects/:projectId/labels returns 409 for duplicate name in same project', async () => {
    await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/labels`,
      headers: authHeader(accessToken),
      payload: { name: 'Bug', color: '#FF5733' },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/labels`,
      headers: authHeader(accessToken),
      payload: { name: 'Bug', color: '#00FF00' },
    })

    expect(res.statusCode).toBe(409)
  })

  it('GET /api/v1/projects/:projectId/labels lists labels for a project', async () => {
    await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/labels`,
      headers: authHeader(accessToken),
      payload: { name: 'Bug', color: '#FF0000' },
    })
    await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/labels`,
      headers: authHeader(accessToken),
      payload: { name: 'Feature', color: '#00FF00' },
    })

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/labels`,
      headers: authHeader(accessToken),
    })

    expect(res.statusCode).toBe(200)
    const labels = res.json<Array<{ name: string }>>()
    expect(labels).toHaveLength(2)
  })

  it('PATCH /api/v1/labels/:labelId updates a label', async () => {
    const { id } = (
      await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/labels`,
        headers: authHeader(accessToken),
        payload: { name: 'Old Label', color: '#AAAAAA' },
      })
    ).json<{ id: string }>()

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/labels/${id}`,
      headers: authHeader(accessToken),
      payload: { name: 'New Label', color: '#BBBBBB' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ name: string; color: string }>()
    expect(body.name).toBe('New Label')
    expect(body.color).toBe('#BBBBBB')
  })

  it('DELETE /api/v1/labels/:labelId deletes a label', async () => {
    const { id } = (
      await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${projectId}/labels`,
        headers: authHeader(accessToken),
        payload: { name: 'To Delete', color: '#123456' },
      })
    ).json<{ id: string }>()

    const del = await app.inject({
      method: 'DELETE',
      url: `/api/v1/labels/${id}`,
      headers: authHeader(accessToken),
    })
    expect(del.statusCode).toBe(204)
  })

  it('same label name is allowed in different projects', async () => {
    // Create a second project
    const project2Id = (
      await app.inject({
        method: 'POST',
        url: '/api/v1/projects',
        headers: authHeader(accessToken),
        payload: { name: 'Second Project' },
      })
    ).json<{ id: string }>().id

    // Add 'Bug' to both projects — should both succeed
    const res1 = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/labels`,
      headers: authHeader(accessToken),
      payload: { name: 'Bug', color: '#FF0000' },
    })
    const res2 = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${project2Id}/labels`,
      headers: authHeader(accessToken),
      payload: { name: 'Bug', color: '#FF0000' },
    })

    expect(res1.statusCode).toBe(201)
    expect(res2.statusCode).toBe(201)
  })
})
