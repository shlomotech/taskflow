import supertest from 'supertest';
import type { FastifyInstance } from 'fastify';

export type TestAgent = ReturnType<typeof supertest>;

/**
 * Creates a supertest agent bound to the given Fastify app server.
 * Caller is responsible for starting/closing the app.
 */
export function createAgent(app: FastifyInstance): TestAgent {
  return supertest(app.server);
}

/**
 * Registers a user and returns the auth tokens + user payload.
 */
export async function registerUser(
  agent: TestAgent,
  data: { name: string; email: string; password: string },
) {
  const res = await agent.post('/api/v1/auth/register').send(data);
  if (res.status !== 201) {
    throw new Error(
      `registerUser failed (${res.status}): ${JSON.stringify(res.body)}`,
    );
  }
  return res.body.data as {
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; name: string };
  };
}

/**
 * Logs in a user and returns the auth tokens.
 */
export async function loginUser(
  agent: TestAgent,
  data: { email: string; password: string },
) {
  const res = await agent.post('/api/v1/auth/login').send(data);
  if (res.status !== 200) {
    throw new Error(
      `loginUser failed (${res.status}): ${JSON.stringify(res.body)}`,
    );
  }
  return res.body.data as {
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; name: string };
  };
}

/**
 * Creates a project and returns its payload.
 */
export async function createProject(
  agent: TestAgent,
  token: string,
  data: { name: string; description?: string },
) {
  const res = await agent
    .post('/api/v1/projects')
    .set('Authorization', `Bearer ${token}`)
    .send(data);
  if (res.status !== 201) {
    throw new Error(
      `createProject failed (${res.status}): ${JSON.stringify(res.body)}`,
    );
  }
  return res.body.data as { id: string; name: string };
}

/**
 * Creates a task within a project and returns its payload.
 */
export async function createTask(
  agent: TestAgent,
  token: string,
  projectId: string,
  data: { title: string; description?: string },
) {
  const res = await agent
    .post(`/api/v1/projects/${projectId}/tasks`)
    .set('Authorization', `Bearer ${token}`)
    .send(data);
  if (res.status !== 201) {
    throw new Error(
      `createTask failed (${res.status}): ${JSON.stringify(res.body)}`,
    );
  }
  return res.body.data as { id: string; title: string; position: number };
}

/** Unique email generator for test isolation */
let counter = 0;
export function uniqueEmail(prefix = 'user'): string {
  return `${prefix}-${Date.now()}-${++counter}@test.example`;
}
