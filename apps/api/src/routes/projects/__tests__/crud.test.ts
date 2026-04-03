import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../../../app.js';
import {
  createAgent,
  registerUser,
  uniqueEmail,
} from '../../../tests/helpers.js';

describe('Projects CRUD & Member Management', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let agent: ReturnType<typeof supertest>;

  let ownerToken: string;
  let ownerId: string;
  let memberToken: string;
  let memberId: string;
  let outsiderToken: string;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    agent = createAgent(app);

    const owner = await registerUser(agent, {
      name: 'Owner',
      email: uniqueEmail('proj-owner'),
      password: 'Password1!',
    });
    ownerToken = owner.accessToken;
    ownerId = owner.user.id;

    const member = await registerUser(agent, {
      name: 'Member',
      email: uniqueEmail('proj-member'),
      password: 'Password1!',
    });
    memberToken = member.accessToken;
    memberId = member.user.id;

    const outsider = await registerUser(agent, {
      name: 'Outsider',
      email: uniqueEmail('proj-outsider'),
      password: 'Password1!',
    });
    outsiderToken = outsider.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/projects', () => {
    it('creates a project and auto-adds creator as owner', async () => {
      const res = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'My Project', description: 'Test project' });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ name: 'My Project' });
      expect(res.body.data).toHaveProperty('id');
    });

    it('returns 422 when name is missing', async () => {
      const res = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});

      expect(res.status).toBe(422);
    });

    it('returns 401 without auth token', async () => {
      const res = await agent
        .post('/api/v1/projects')
        .send({ name: 'Unauthorized' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/projects', () => {
    it('lists only projects where user is member or owner', async () => {
      // Owner creates a project
      const createRes = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Owned Project' });
      const projectId = createRes.body.data.id;

      // Outsider should not see it
      const outsiderRes = await agent
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${outsiderToken}`);
      const outsiderIds = outsiderRes.body.data.map((p: { id: string }) => p.id);
      expect(outsiderIds).not.toContain(projectId);

      // Owner should see it
      const ownerRes = await agent
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${ownerToken}`);
      const ownerIds = ownerRes.body.data.map((p: { id: string }) => p.id);
      expect(ownerIds).toContain(projectId);
    });

    it('returns 401 without auth token', async () => {
      const res = await agent.get('/api/v1/projects');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    it('returns project with member list', async () => {
      const createRes = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Detail Project' });
      const projectId = createRes.body.data.id;

      const res = await agent
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('id', projectId);
      expect(res.body.data).toHaveProperty('members');
      expect(Array.isArray(res.body.data.members)).toBe(true);
    });

    it('returns 403 for non-member', async () => {
      const createRes = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Private Project' });
      const projectId = createRes.body.data.id;

      const res = await agent
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent project', async () => {
      const res = await agent
        .get('/api/v1/projects/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/projects/:id', () => {
    it('owner can update project name and description', async () => {
      const createRes = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Original Name' });
      const projectId = createRes.body.data.id;

      const res = await agent
        .patch(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Updated Name', description: 'Updated desc' });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        name: 'Updated Name',
        description: 'Updated desc',
      });
    });

    it('returns 403 for non-member', async () => {
      const createRes = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Locked Project' });
      const projectId = createRes.body.data.id;

      const res = await agent
        .patch(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ name: 'Hacked' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/projects/:id', () => {
    it('owner can delete a project', async () => {
      const createRes = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'To Delete' });
      const projectId = createRes.body.data.id;

      const res = await agent
        .delete(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(204);

      // Confirm it's gone
      const getRes = await agent
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(getRes.status).toBe(404);
    });

    it('non-owner member cannot delete a project', async () => {
      const createRes = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Protected Project' });
      const projectId = createRes.body.data.id;

      // Add member
      await agent
        .post(`/api/v1/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: memberId, role: 'member' });

      const res = await agent
        .delete(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Member management', () => {
    let sharedProjectId: string;

    beforeAll(async () => {
      const res = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Member Test Project' });
      sharedProjectId = res.body.data.id;
    });

    it('owner can add a member', async () => {
      const res = await agent
        .post(`/api/v1/projects/${sharedProjectId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: memberId, role: 'member' });

      expect(res.status).toBe(201);
    });

    it('GET /members lists all project members', async () => {
      const res = await agent
        .get(`/api/v1/projects/${sharedProjectId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const userIds = res.body.data.map((m: { userId: string }) => m.userId);
      expect(userIds).toContain(memberId);
      expect(userIds).toContain(ownerId);
    });

    it('non-owner cannot add members', async () => {
      const res = await agent
        .post(`/api/v1/projects/${sharedProjectId}/members`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ userId: outsiderToken, role: 'member' });

      expect(res.status).toBe(403);
    });

    it('owner can remove a member', async () => {
      const res = await agent
        .delete(`/api/v1/projects/${sharedProjectId}/members/${memberId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(204);
    });
  });
});
