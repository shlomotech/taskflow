import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../../../app.js';
import { uniqueEmail } from '../../../tests/helpers.js';

describe('POST /api/v1/auth/register', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let agent: ReturnType<typeof supertest>;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    agent = supertest(app.server);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a user and returns 201 with tokens and user data', async () => {
    const email = uniqueEmail('register');
    const res = await agent.post('/api/v1/auth/register').send({
      name: 'Alice',
      email,
      password: 'Password1!',
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.user).toMatchObject({
      email,
      name: 'Alice',
    });
    expect(res.body.data.user).toHaveProperty('id');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('returns 409 when email is already registered', async () => {
    const email = uniqueEmail('dup');
    const payload = { name: 'Bob', email, password: 'Password1!' };

    await agent.post('/api/v1/auth/register').send(payload);
    const res = await agent.post('/api/v1/auth/register').send(payload);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('returns 422 when email is missing', async () => {
    const res = await agent.post('/api/v1/auth/register').send({
      name: 'Charlie',
      password: 'Password1!',
    });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 when email is invalid format', async () => {
    const res = await agent.post('/api/v1/auth/register').send({
      name: 'Charlie',
      email: 'not-an-email',
      password: 'Password1!',
    });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 when password is too short', async () => {
    const res = await agent.post('/api/v1/auth/register').send({
      name: 'Charlie',
      email: uniqueEmail('short-pw'),
      password: 'abc',
    });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 when name is missing', async () => {
    const res = await agent.post('/api/v1/auth/register').send({
      email: uniqueEmail('noname'),
      password: 'Password1!',
    });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 422 when request body is empty', async () => {
    const res = await agent.post('/api/v1/auth/register').send({});

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
