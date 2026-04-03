import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../../../app.js';
import {
  createAgent,
  createProject,
  registerUser,
  uniqueEmail,
} from '../../../tests/helpers.js';

describe('Tasks CRUD & Label Assignment', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let agent: ReturnType<typeof supertest>;

  let token: string;
  let userId: string;
  let projectId: string;
  let outsiderToken: string;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    agent = createAgent(app);

    const user = await registerUser(agent, {
      name: 'TaskUser',
      email: uniqueEmail('task-user'),
      password: 'Password1!',
    });
    token = user.accessToken;
    userId = user.user.id;

    const outsider = await registerUser(agent, {
      name: 'Outsider',
      email: uniqueEmail('task-outsider'),
      password: 'Password1!',
    });
    outsiderToken = outsider.accessToken;

    const project = await createProject(agent, token, { name: 'Task Project' });
    projectId = project.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/projects/:projectId/tasks', () => {
    it('creates a task with default status and priority', async () => {
      const res = await agent
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'First task' });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        title: 'First task',
        status: 'todo',
        priority: 'medium',
      });
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('position');
    });

    it('creates a task with explicit status and priority', async () => {
      const res = await agent
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'High priority task',
          status: 'in_progress',
          priority: 'high',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        status: 'in_progress',
        priority: 'high',
      });
    });

    it('returns 422 when title is missing', async () => {
      const res = await agent
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(422);
    });

    it('returns 403 for non-member', async () => {
      const res = await agent
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ title: 'Unauthorized task' });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/projects/:projectId/tasks', () => {
    it('returns task list ordered by position ASC', async () => {
      const res = await agent
        .get(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      const positions = res.body.data.map((t: { position: number }) => t.position);
      const sorted = [...positions].sort((a, b) => a - b);
      expect(positions).toEqual(sorted);
    });

    it('filters by status', async () => {
      await agent
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Done task', status: 'done' });

      const res = await agent
        .get(`/api/v1/projects/${projectId}/tasks?status=done`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      for (const task of res.body.data) {
        expect(task.status).toBe('done');
      }
    });

    it('filters by assigneeId', async () => {
      await agent
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Assigned task', assigneeId: userId });

      const res = await agent
        .get(`/api/v1/projects/${projectId}/tasks?assigneeId=${userId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      for (const task of res.body.data) {
        expect(task.assigneeId).toBe(userId);
      }
    });

    it('returns 403 for non-member', async () => {
      const res = await agent
        .get(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/tasks/:id', () => {
    it('returns full task with labels and comment count', async () => {
      const createRes = await agent
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Detail task' });
      const taskId = createRes.body.data.id;

      const res = await agent
        .get(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: taskId, title: 'Detail task' });
      expect(res.body.data).toHaveProperty('labels');
      expect(res.body.data).toHaveProperty('commentCount');
    });

    it('returns 404 for non-existent task', async () => {
      const res = await agent
        .get('/api/v1/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/tasks/:id', () => {
    it('updates task fields', async () => {
      const createRes = await agent
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Patchable task' });
      const taskId = createRes.body.data.id;

      const res = await agent
        .patch(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated title', status: 'in_review', priority: 'critical' });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        title: 'Updated title',
        status: 'in_review',
        priority: 'critical',
      });
    });

    it('returns 403 for non-member', async () => {
      const createRes = await agent
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Protected task' });
      const taskId = createRes.body.data.id;

      const res = await agent
        .patch(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ title: 'Hacked' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    it('deletes a task', async () => {
      const createRes = await agent
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Delete me' });
      const taskId = createRes.body.data.id;

      const res = await agent
        .delete(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);

      const getRes = await agent
        .get(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(getRes.status).toBe(404);
    });
  });

  describe('Label assignment', () => {
    it('can assign a label to a task', async () => {
      // Create a label for the project
      const labelRes = await agent
        .post(`/api/v1/projects/${projectId}/labels`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Bug', color: '#ff0000' });
      expect(labelRes.status).toBe(201);
      const labelId = labelRes.body.data.id;

      // Create a task
      const taskRes = await agent
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Label task' });
      const taskId = taskRes.body.data.id;

      // Assign label
      const res = await agent
        .post(`/api/v1/tasks/${taskId}/labels/${labelId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(201);

      // Verify label appears on task
      const taskDetail = await agent
        .get(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`);
      const labelIds = taskDetail.body.data.labels.map((l: { id: string }) => l.id);
      expect(labelIds).toContain(labelId);
    });

    it('can remove a label from a task', async () => {
      const labelRes = await agent
        .post(`/api/v1/projects/${projectId}/labels`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Feature', color: '#00ff00' });
      const labelId = labelRes.body.data.id;

      const taskRes = await agent
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Unlabel task' });
      const taskId = taskRes.body.data.id;

      await agent
        .post(`/api/v1/tasks/${taskId}/labels/${labelId}`)
        .set('Authorization', `Bearer ${token}`);

      const res = await agent
        .delete(`/api/v1/tasks/${taskId}/labels/${labelId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);
    });
  });
});
