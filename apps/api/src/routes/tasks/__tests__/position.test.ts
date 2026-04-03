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

describe('Task Kanban Position (PATCH /api/v1/tasks/:id/position)', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let agent: ReturnType<typeof supertest>;

  let token: string;
  let projectId: string;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    agent = createAgent(app);

    const user = await registerUser(agent, {
      name: 'PosUser',
      email: uniqueEmail('pos-user'),
      password: 'Password1!',
    });
    token = user.accessToken;

    const project = await createProject(agent, token, { name: 'Position Project' });
    projectId = project.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('new tasks are appended with position = max + 1000', async () => {
    const t1 = await createTask(agent, token, projectId, { title: 'Task 1' });
    const t2 = await createTask(agent, token, projectId, { title: 'Task 2' });

    expect(t2.position).toBe(t1.position + 1000);
  });

  it('midpoint insert: positions a task between two others', async () => {
    const t1 = await createTask(agent, token, projectId, { title: 'Pos A' });
    const t3 = await createTask(agent, token, projectId, { title: 'Pos C' });

    // The expected midpoint position
    const midpoint = (t1.position + t3.position) / 2;

    const t2 = await createTask(agent, token, projectId, { title: 'Pos B' });

    const res = await agent
      .patch(`/api/v1/tasks/${t2.id}/position`)
      .set('Authorization', `Bearer ${token}`)
      .send({ position: midpoint });

    expect(res.status).toBe(200);
    expect(res.body.data.position).toBeCloseTo(midpoint, 5);
  });

  it('returns 200 when moving a task to the front (position < first task)', async () => {
    const t1 = await createTask(agent, token, projectId, { title: 'Movable front target' });
    const t2 = await createTask(agent, token, projectId, { title: 'Move to front' });

    const newPosition = t1.position / 2;

    const res = await agent
      .patch(`/api/v1/tasks/${t2.id}/position`)
      .set('Authorization', `Bearer ${token}`)
      .send({ position: newPosition });

    expect(res.status).toBe(200);
    expect(res.body.data.position).toBeCloseTo(newPosition, 5);
  });

  it('returns 200 when moving a task to the back', async () => {
    const t1 = await createTask(agent, token, projectId, { title: 'Last A' });
    const t2 = await createTask(agent, token, projectId, { title: 'Move to back' });

    const newPosition = t1.position + 2000;

    const res = await agent
      .patch(`/api/v1/tasks/${t2.id}/position`)
      .set('Authorization', `Bearer ${token}`)
      .send({ position: newPosition });

    expect(res.status).toBe(200);
    expect(res.body.data.position).toBeCloseTo(newPosition, 5);
  });

  it('re-normalizes positions when gap < 1', async () => {
    // Create two tasks and compress their positions to near-collision
    const t1 = await createTask(agent, token, projectId, { title: 'Renorm A' });
    const t2 = await createTask(agent, token, projectId, { title: 'Renorm B' });

    // Force positions to be extremely close (gap < 1)
    const tinyGapPosition = t1.position + 0.0001;

    const res = await agent
      .patch(`/api/v1/tasks/${t2.id}/position`)
      .set('Authorization', `Bearer ${token}`)
      .send({ position: tinyGapPosition });

    expect(res.status).toBe(200);

    // After re-normalization, positions should be multiples of 1000 and evenly spaced
    const listRes = await agent
      .get(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${token}`);

    const positions: number[] = listRes.body.data.map((t: { position: number }) => t.position);

    // All gaps should be >= 1 after re-normalization
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i] - positions[i - 1]).toBeGreaterThanOrEqual(1);
    }
  });

  it('returns 422 when position is missing', async () => {
    const task = await createTask(agent, token, projectId, { title: 'No position' });

    const res = await agent
      .patch(`/api/v1/tasks/${task.id}/position`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(422);
  });

  it('returns 404 for non-existent task', async () => {
    const res = await agent
      .patch('/api/v1/tasks/00000000-0000-0000-0000-000000000000/position')
      .set('Authorization', `Bearer ${token}`)
      .send({ position: 1000 });

    expect(res.status).toBe(404);
  });
});
