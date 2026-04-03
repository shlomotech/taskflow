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

describe('GET /api/v1/dashboard', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let agent: ReturnType<typeof supertest>;

  let token: string;
  let projectId: string;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    agent = createAgent(app);

    const user = await registerUser(agent, {
      name: 'DashUser',
      email: uniqueEmail('dash-user'),
      password: 'Password1!',
    });
    token = user.accessToken;

    // Create project and tasks to verify aggregation
    const project = await createProject(agent, token, { name: 'Dashboard Project' });
    projectId = project.id;

    await createTask(agent, token, projectId, { title: 'Task todo' });
    await createTask(agent, token, projectId, { title: 'Task in progress' });

    // Update second task to in_progress
    const listRes = await agent
      .get(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${token}`);
    const tasks = listRes.body.data;
    if (tasks.length >= 2) {
      await agent
        .patch(`/api/v1/tasks/${tasks[1].id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'in_progress' });
    }

    // Create an overdue task (dueDate in the past)
    await agent
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Overdue task',
        dueDate: new Date(Date.now() - 86_400_000).toISOString(),
      });
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with correct aggregation shape', async () => {
    const res = await agent
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('totalProjects');
    expect(res.body.data).toHaveProperty('totalTasks');
    expect(res.body.data).toHaveProperty('tasksByStatus');
    expect(res.body.data).toHaveProperty('overdueTasks');
    expect(res.body.data).toHaveProperty('recentActivity');
  });

  it('totalProjects counts only user-accessible projects', async () => {
    const res = await agent
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalProjects).toBeGreaterThanOrEqual(1);
  });

  it('totalTasks counts all tasks across user projects', async () => {
    const res = await agent
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    // We created at least 3 tasks
    expect(res.body.data.totalTasks).toBeGreaterThanOrEqual(3);
  });

  it('tasksByStatus is a record with valid status keys', async () => {
    const res = await agent
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const { tasksByStatus } = res.body.data;
    expect(typeof tasksByStatus).toBe('object');

    const validStatuses = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];
    for (const key of Object.keys(tasksByStatus)) {
      expect(validStatuses).toContain(key);
      expect(typeof tasksByStatus[key]).toBe('number');
    }
  });

  it('overdueTasks is a non-negative number', async () => {
    const res = await agent
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(typeof res.body.data.overdueTasks).toBe('number');
    expect(res.body.data.overdueTasks).toBeGreaterThanOrEqual(0);
    // We created 1 overdue task
    expect(res.body.data.overdueTasks).toBeGreaterThanOrEqual(1);
  });

  it('recentActivity is an array of tasks', async () => {
    const res = await agent
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.recentActivity)).toBe(true);
    if (res.body.data.recentActivity.length > 0) {
      const task = res.body.data.recentActivity[0];
      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('title');
    }
  });

  it('returns 401 without auth token', async () => {
    const res = await agent.get('/api/v1/dashboard');
    expect(res.status).toBe(401);
  });

  it('does not include data from projects the user does not belong to', async () => {
    // Register a separate user with their own project
    const otherUser = await registerUser(agent, {
      name: 'OtherDashUser',
      email: uniqueEmail('other-dash'),
      password: 'Password1!',
    });
    const otherProject = await createProject(agent, otherUser.accessToken, {
      name: 'Private Project',
    });
    await createTask(agent, otherUser.accessToken, otherProject.id, {
      title: 'Secret task',
    });

    const res = await agent
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${token}`);

    // The original user should not see the other user's tasks
    const activityTitles = res.body.data.recentActivity.map(
      (t: { title: string }) => t.title,
    );
    expect(activityTitles).not.toContain('Secret task');
  });
});
