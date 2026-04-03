import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../../../app.js';
import {
  createAgent,
  createProject,
  createTask,
  registerUser,
  uniqueEmail,
} from '../../../tests/helpers.js';

describe('Comments CRUD (pagination & author-only guard)', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let agent: ReturnType<typeof supertest>;

  let authorToken: string;
  let authorId: string;
  let otherToken: string;
  let projectId: string;
  let taskId: string;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    agent = createAgent(app);

    const author = await registerUser(agent, {
      name: 'Author',
      email: uniqueEmail('comment-author'),
      password: 'Password1!',
    });
    authorToken = author.accessToken;
    authorId = author.user.id;

    const other = await registerUser(agent, {
      name: 'Other',
      email: uniqueEmail('comment-other'),
      password: 'Password1!',
    });
    otherToken = other.accessToken;

    const project = await createProject(agent, authorToken, { name: 'Comment Project' });
    projectId = project.id;

    // Add other user as member so they can read but we can test author guard
    await agent
      .post(`/api/v1/projects/${projectId}/members`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ userId: other.user.id, role: 'member' });

    const task = await createTask(agent, authorToken, projectId, {
      title: 'Commented task',
    });
    taskId = task.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/tasks/:taskId/comments', () => {
    it('creates a comment', async () => {
      const res = await agent
        .post(`/api/v1/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ body: 'First comment' });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        body: 'First comment',
        authorId,
      });
      expect(res.body.data).toHaveProperty('id');
    });

    it('returns 422 when body is empty', async () => {
      const res = await agent
        .post(`/api/v1/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ body: '' });

      expect(res.status).toBe(422);
    });

    it('returns 422 when body is missing', async () => {
      const res = await agent
        .post(`/api/v1/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({});

      expect(res.status).toBe(422);
    });

    it('returns 401 without auth', async () => {
      const res = await agent
        .post(`/api/v1/tasks/${taskId}/comments`)
        .send({ body: 'Anon comment' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/tasks/:taskId/comments (pagination)', () => {
    beforeAll(async () => {
      // Create 25 comments for pagination tests
      for (let i = 1; i <= 25; i++) {
        await agent
          .post(`/api/v1/tasks/${taskId}/comments`)
          .set('Authorization', `Bearer ${authorToken}`)
          .send({ body: `Paginated comment ${i}` });
      }
    });

    it('returns default page of 20 comments', async () => {
      const res = await agent
        .get(`/api/v1/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${authorToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(20);
    });

    it('supports ?limit parameter', async () => {
      const res = await agent
        .get(`/api/v1/tasks/${taskId}/comments?limit=5`)
        .set('Authorization', `Bearer ${authorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(5);
    });

    it('supports cursor-based pagination', async () => {
      // First page
      const firstRes = await agent
        .get(`/api/v1/tasks/${taskId}/comments?limit=5`)
        .set('Authorization', `Bearer ${authorToken}`);

      expect(firstRes.status).toBe(200);
      expect(firstRes.body).toHaveProperty('cursor');

      const cursor = firstRes.body.cursor;
      if (cursor) {
        // Second page using cursor
        const secondRes = await agent
          .get(`/api/v1/tasks/${taskId}/comments?limit=5&cursor=${cursor}`)
          .set('Authorization', `Bearer ${authorToken}`);

        expect(secondRes.status).toBe(200);
        // IDs on second page should not overlap with first page
        const firstIds = firstRes.body.data.map((c: { id: string }) => c.id);
        const secondIds = secondRes.body.data.map((c: { id: string }) => c.id);
        const overlap = firstIds.filter((id: string) => secondIds.includes(id));
        expect(overlap).toHaveLength(0);
      }
    });
  });

  describe('PATCH /api/v1/comments/:id (author-only guard)', () => {
    let commentId: string;

    beforeAll(async () => {
      const res = await agent
        .post(`/api/v1/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ body: 'Editable comment' });
      commentId = res.body.data.id;
    });

    it('author can update their comment', async () => {
      const res = await agent
        .patch(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ body: 'Edited comment' });

      expect(res.status).toBe(200);
      expect(res.body.data.body).toBe('Edited comment');
    });

    it('non-author cannot edit the comment', async () => {
      const res = await agent
        .patch(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ body: 'Hijacked' });

      expect(res.status).toBe(403);
    });

    it('returns 422 when body is empty', async () => {
      const res = await agent
        .patch(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ body: '' });

      expect(res.status).toBe(422);
    });
  });

  describe('DELETE /api/v1/comments/:id (author-only guard)', () => {
    it('non-author cannot delete the comment', async () => {
      const createRes = await agent
        .post(`/api/v1/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ body: 'Comment to guard' });
      const commentId = createRes.body.data.id;

      const res = await agent
        .delete(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
    });

    it('author can delete their comment', async () => {
      const createRes = await agent
        .post(`/api/v1/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({ body: 'Delete me' });
      const commentId = createRes.body.data.id;

      const res = await agent
        .delete(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${authorToken}`);

      expect(res.status).toBe(204);
    });
  });
});
