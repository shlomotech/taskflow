/**
 * Integration tests for comment endpoints.
 *
 * Routes expected: POST/GET/DELETE /projects/:projectId/tasks/:taskId/comments
 * All routes require authentication. Delete requires comment authorship.
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
  await pool.query('DELETE FROM comments')
  await pool.query('DELETE FROM tasks')
  await pool.query('DELETE FROM projects')
  await pool.query('DELETE FROM users')
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function seedProjectAndTask(token: string): Promise<{ projectId: string; taskId: string }> {
  const pRes = await app.inject({
    method: 'POST',
    url: '/projects',
    headers: { authorization: bearer(token) },
    payload: { name: 'Comment Test Project' },
  })
  const projectId = pRes.json<{ id: string }>().id

  const tRes = await app.inject({
    method: 'POST',
    url: `/projects/${projectId}/tasks`,
    headers: { authorization: bearer(token) },
    payload: { title: 'Task for comments', status: 'todo', priority: 'medium' },
  })
  const taskId = tRes.json<{ id: string }>().id

  return { projectId, taskId }
}

function commentUrl(projectId: string, taskId: string, commentId?: string): string {
  const base = `/projects/${projectId}/tasks/${taskId}/comments`
  return commentId ? `${base}/${commentId}` : base
}

// ---------------------------------------------------------------------------
// POST /projects/:projectId/tasks/:taskId/comments
// ---------------------------------------------------------------------------

describe('POST comment', () => {
  let user: TestUser
  let projectId: string
  let taskId: string

  beforeEach(async () => {
    user = await createTestUser(app)
    ;({ projectId, taskId } = await seedProjectAndTask(user.accessToken))
  })

  it('returns 201 with the created comment', async () => {
    const res = await app.inject({
      method: 'POST',
      url: commentUrl(projectId, taskId),
      headers: { authorization: bearer(user.accessToken) },
      payload: { body: 'Great progress!' },
    })

    expect(res.statusCode).toBe(201)
    const comment = res.json<{ id: string; body: string; authorId: string }>()
    expect(comment.body).toBe('Great progress!')
    expect(comment.authorId).toBe(user.userId)
    expect(typeof comment.id).toBe('string')
  })

  it('returns 401 when no auth token is provided', async () => {
    const res = await app.inject({
      method: 'POST',
      url: commentUrl(projectId, taskId),
      payload: { body: 'Unauthenticated' },
    })

    expect(res.statusCode).toBe(401)
  })

  it('returns 400 when body is empty', async () => {
    const res = await app.inject({
      method: 'POST',
      url: commentUrl(projectId, taskId),
      headers: { authorization: bearer(user.accessToken) },
      payload: { body: '' },
    })

    expect(res.statusCode).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// GET /projects/:projectId/tasks/:taskId/comments
// ---------------------------------------------------------------------------

describe('GET comments', () => {
  let user: TestUser
  let projectId: string
  let taskId: string

  beforeEach(async () => {
    user = await createTestUser(app)
    ;({ projectId, taskId } = await seedProjectAndTask(user.accessToken))
    // Seed two comments
    for (const body of ['First comment', 'Second comment']) {
      await app.inject({
        method: 'POST',
        url: commentUrl(projectId, taskId),
        headers: { authorization: bearer(user.accessToken) },
        payload: { body },
      })
    }
  })

  it('returns 200 with all comments for the task', async () => {
    const res = await app.inject({
      method: 'GET',
      url: commentUrl(projectId, taskId),
      headers: { authorization: bearer(user.accessToken) },
    })

    expect(res.statusCode).toBe(200)
    const comments = res.json<unknown[]>()
    const list = Array.isArray(comments) ? comments : (comments as { data: unknown[] }).data
    expect(list.length).toBe(2)
  })

  it('returns 401 when no auth token is provided', async () => {
    const res = await app.inject({ method: 'GET', url: commentUrl(projectId, taskId) })

    expect(res.statusCode).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// DELETE /projects/:projectId/tasks/:taskId/comments/:commentId
// ---------------------------------------------------------------------------

describe('DELETE comment', () => {
  let author: TestUser
  let otherUser: TestUser
  let projectId: string
  let taskId: string
  let commentId: string

  beforeEach(async () => {
    author = await createTestUser(app)
    otherUser = await createTestUser(app)
    ;({ projectId, taskId } = await seedProjectAndTask(author.accessToken))

    const res = await app.inject({
      method: 'POST',
      url: commentUrl(projectId, taskId),
      headers: { authorization: bearer(author.accessToken) },
      payload: { body: 'Author\'s comment' },
    })
    commentId = res.json<{ id: string }>().id
  })

  it('returns 204 when the author deletes their own comment', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: commentUrl(projectId, taskId, commentId),
      headers: { authorization: bearer(author.accessToken) },
    })

    expect(res.statusCode).toBe(204)
  })

  it('returns 403 when a non-author tries to delete the comment', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: commentUrl(projectId, taskId, commentId),
      headers: { authorization: bearer(otherUser.accessToken) },
    })

    expect(res.statusCode).toBe(403)
  })

  it('returns 404 after the comment has been deleted', async () => {
    await app.inject({
      method: 'DELETE',
      url: commentUrl(projectId, taskId, commentId),
      headers: { authorization: bearer(author.accessToken) },
    })

    const res = await app.inject({
      method: 'GET',
      url: commentUrl(projectId, taskId),
      headers: { authorization: bearer(author.accessToken) },
    })

    expect(res.statusCode).toBe(200)
    const list = res.json<unknown[]>()
    const comments = Array.isArray(list) ? list : (list as { data: unknown[] }).data
    expect(comments.find((c) => (c as { id: string }).id === commentId)).toBeUndefined()
  })
})
