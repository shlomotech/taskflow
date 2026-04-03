import { describe, expect, it } from 'vitest';
import bcrypt from 'bcrypt';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../auth.service.js';

// These are unit tests — no DB, no HTTP, no app instance needed.

const TEST_ACCESS_SECRET = 'test-access-secret-min-32-chars!!';
const TEST_REFRESH_SECRET = 'test-refresh-secret-min-32-chars!!';

describe('hashPassword', () => {
  it('returns a bcrypt hash', async () => {
    const hash = await hashPassword('Password1!');
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it('produces different hashes for the same password (salt randomness)', async () => {
    const h1 = await hashPassword('Password1!');
    const h2 = await hashPassword('Password1!');
    expect(h1).not.toBe(h2);
  });

  it('uses cost factor >= 10', async () => {
    const hash = await hashPassword('Password1!');
    const rounds = bcrypt.getRounds(hash);
    expect(rounds).toBeGreaterThanOrEqual(10);
  });
});

describe('verifyPassword', () => {
  it('returns true for matching password', async () => {
    const hash = await hashPassword('Password1!');
    const result = await verifyPassword('Password1!', hash);
    expect(result).toBe(true);
  });

  it('returns false for wrong password', async () => {
    const hash = await hashPassword('Password1!');
    const result = await verifyPassword('WrongPassword!', hash);
    expect(result).toBe(false);
  });

  it('returns false for empty string against a real hash', async () => {
    const hash = await hashPassword('Password1!');
    const result = await verifyPassword('', hash);
    expect(result).toBe(false);
  });
});

describe('generateAccessToken', () => {
  it('generates a signed JWT string', () => {
    const token = generateAccessToken(
      { sub: 'user-123', email: 'alice@test.example', name: 'Alice' },
      TEST_ACCESS_SECRET,
    );
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // header.payload.signature
  });

  it('encodes sub, email, and name in payload', () => {
    const payload = { sub: 'user-456', email: 'bob@test.example', name: 'Bob' };
    const token = generateAccessToken(payload, TEST_ACCESS_SECRET);

    const decoded = verifyAccessToken(token, TEST_ACCESS_SECRET);
    expect(decoded).toMatchObject(payload);
  });

  it('expires in ~15 minutes', () => {
    const token = generateAccessToken(
      { sub: 'user-789', email: 'carol@test.example', name: 'Carol' },
      TEST_ACCESS_SECRET,
    );
    const decoded = verifyAccessToken(token, TEST_ACCESS_SECRET) as { exp: number; iat: number };
    const ttl = decoded.exp - decoded.iat;
    // 15 min = 900 seconds; allow ±60 s tolerance
    expect(ttl).toBeGreaterThanOrEqual(840);
    expect(ttl).toBeLessThanOrEqual(960);
  });
});

describe('generateRefreshToken', () => {
  it('generates a signed JWT string', () => {
    const token = generateRefreshToken('user-123', TEST_REFRESH_SECRET);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('encodes sub in payload', () => {
    const token = generateRefreshToken('user-abc', TEST_REFRESH_SECRET);
    const decoded = verifyRefreshToken(token, TEST_REFRESH_SECRET) as { sub: string };
    expect(decoded.sub).toBe('user-abc');
  });

  it('expires in ~7 days', () => {
    const token = generateRefreshToken('user-xyz', TEST_REFRESH_SECRET);
    const decoded = verifyRefreshToken(token, TEST_REFRESH_SECRET) as { exp: number; iat: number };
    const ttl = decoded.exp - decoded.iat;
    const sevenDays = 7 * 24 * 60 * 60;
    // Allow ±5 min tolerance
    expect(ttl).toBeGreaterThanOrEqual(sevenDays - 300);
    expect(ttl).toBeLessThanOrEqual(sevenDays + 300);
  });
});

describe('verifyAccessToken', () => {
  it('returns decoded payload for a valid token', () => {
    const payload = { sub: 'u1', email: 'a@b.com', name: 'A' };
    const token = generateAccessToken(payload, TEST_ACCESS_SECRET);
    const decoded = verifyAccessToken(token, TEST_ACCESS_SECRET);
    expect(decoded).toMatchObject(payload);
  });

  it('throws for a token signed with wrong secret', () => {
    const token = generateAccessToken(
      { sub: 'u1', email: 'a@b.com', name: 'A' },
      TEST_ACCESS_SECRET,
    );
    expect(() => verifyAccessToken(token, 'wrong-secret')).toThrow();
  });

  it('throws for a malformed token string', () => {
    expect(() => verifyAccessToken('not.a.jwt', TEST_ACCESS_SECRET)).toThrow();
  });
});

describe('verifyRefreshToken', () => {
  it('returns decoded payload for a valid token', () => {
    const token = generateRefreshToken('u2', TEST_REFRESH_SECRET);
    const decoded = verifyRefreshToken(token, TEST_REFRESH_SECRET) as { sub: string };
    expect(decoded.sub).toBe('u2');
  });

  it('throws for a token signed with wrong secret', () => {
    const token = generateRefreshToken('u2', TEST_REFRESH_SECRET);
    expect(() => verifyRefreshToken(token, 'wrong-secret')).toThrow();
  });

  it('rejects an access token presented as a refresh token', () => {
    // Access and refresh tokens use different secrets — cross-secret verification should fail
    const accessToken = generateAccessToken(
      { sub: 'u3', email: 'x@y.com', name: 'X' },
      TEST_ACCESS_SECRET,
    );
    expect(() => verifyRefreshToken(accessToken, TEST_REFRESH_SECRET)).toThrow();
  });
});
