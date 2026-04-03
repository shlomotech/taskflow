import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../../../app.js';
import { uniqueEmail } from '../../../tests/helpers.js';

describe('POST /api/v1/auth/login', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let agent: ReturnType<typeof supertest>;

  const email = uniqueEmail('login');
  const password = 'Password1!';
  const name = 'LoginUser';

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    agent = supertest(app.server);

    // Seed one user for login tests
    await agent.post('/api/v1/auth/register').send({ name, email, password });
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with access token, refresh token, and user on success', async () => {
    const res = await agent.post('/api/v1/auth/login').send({ email, password });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.user).toMatchObject({ email, name });
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('returns 401 when password is wrong', async () => {
    const res = await agent
      .post('/api/v1/auth/login')
      .send({ email, password: 'WrongPass1!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 401 when email is not registered', async () => {
    const res = await agent
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@test.example', password: 'Password1!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 422 when email is missing', async () => {
    const res = await agent.post('/api/v1/auth/login').send({ password });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 when password is missing', async () => {
    const res = await agent.post('/api/v1/auth/login').send({ email });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
