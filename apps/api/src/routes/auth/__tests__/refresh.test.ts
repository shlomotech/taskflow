import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../../../app.js';
import { uniqueEmail } from '../../../tests/helpers.js';

describe('POST /api/v1/auth/refresh', () => {
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

  async function registerAndGetTokens() {
    const res = await agent.post('/api/v1/auth/register').send({
      name: 'RefreshUser',
      email: uniqueEmail('refresh'),
      password: 'Password1!',
    });
    expect(res.status).toBe(201);
    return res.body.data as { accessToken: string; refreshToken: string };
  }

  it('rotates tokens: returns new access + refresh tokens on valid refresh token', async () => {
    const { refreshToken } = await registerAndGetTokens();

    const res = await agent
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    // New refresh token must differ from the original
    expect(res.body.data.refreshToken).not.toBe(refreshToken);
  });

  it('new access token is usable for authenticated requests', async () => {
    const { refreshToken } = await registerAndGetTokens();

    const refreshRes = await agent
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });
    const newAccessToken = refreshRes.body.data.accessToken;

    const dashRes = await agent
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${newAccessToken}`);

    expect(dashRes.status).toBe(200);
  });

  it('replay attack: reusing a consumed refresh token returns 401 and invalidates family', async () => {
    const { refreshToken: originalToken } = await registerAndGetTokens();

    // First use — consumes the token
    const firstRes = await agent
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: originalToken });
    expect(firstRes.status).toBe(200);

    const newToken = firstRes.body.data.refreshToken;

    // Replay the original (already consumed) token — should trigger family invalidation
    const replayRes = await agent
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: originalToken });
    expect(replayRes.status).toBe(401);
    expect(replayRes.body.error.code).toBe('INVALID_REFRESH_TOKEN');

    // New token from rotation should also be invalidated (family invalidation)
    const newTokenRes = await agent
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: newToken });
    expect(newTokenRes.status).toBe(401);
    expect(newTokenRes.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('returns 401 for an expired or malformed refresh token', async () => {
    const res = await agent
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'this.is.not.a.valid.jwt' });

    expect(res.status).toBe(401);
  });

  it('returns 422 when refreshToken is missing from body', async () => {
    const res = await agent.post('/api/v1/auth/refresh').send({});

    expect(res.status).toBe(422);
  });
});
