import { describe, expect, it, vi } from "vitest";
import { verifyPassword } from "../lib/password.js";
import { AppError } from "../lib/errors.js";
import { PostgresAuthService } from "./auth.service.js";

describe("PostgresAuthService", () => {
  it("normalizes email and hashes passwords during registration", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          email: "ada@example.com",
          id: "user-1",
          name: "Ada Lovelace",
        },
      ],
    });
    const service = new PostgresAuthService({
      query,
    } as never);

    const result = await service.register({
      email: "  ADA@Example.com ",
      name: "Ada Lovelace",
      password: "password123",
    });

    expect(result).toEqual({
      email: "ada@example.com",
      id: "user-1",
      name: "Ada Lovelace",
    });
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][1][1]).toBe("ada@example.com");
    expect(query.mock.calls[0][1][3]).not.toBe("password123");
    await expect(
      verifyPassword("password123", query.mock.calls[0][1][3]),
    ).resolves.toBe(true);
  });

  it("maps duplicate email errors to EMAIL_TAKEN", async () => {
    const service = new PostgresAuthService({
      query: vi.fn().mockRejectedValue({ code: "23505" }),
    } as never);

    await expect(
      service.register({
        email: "ada@example.com",
        name: "Ada Lovelace",
        password: "password123",
      }),
    ).rejects.toMatchObject({
      code: "EMAIL_TAKEN",
      statusCode: 409,
    });
  });

  it("rejects logins when the password does not match", async () => {
    const service = new PostgresAuthService({
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            email: "ada@example.com",
            id: "user-1",
            name: "Ada Lovelace",
            password_hash: "$2b$12$5bW30jjuvWcQmPtoQcT2Hud1x0W2uG4SL0qqD1jM0j7j8k7q5uD2S",
          },
        ],
      }),
    } as never);

    await expect(
      service.login({
        email: "ada@example.com",
        password: "wrong-password",
      }),
    ).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
      statusCode: 401,
    });
  });

  it("rotates refresh tokens inside a transaction", async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({
          rows: [
            {
              expires_at: new Date(Date.now() + 60_000),
              user_id: "user-1",
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              email: "ada@example.com",
              id: "user-1",
              name: "Ada Lovelace",
            },
          ],
        })
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined),
      release: vi.fn(),
    };
    const service = new PostgresAuthService({
      connect: vi.fn().mockResolvedValue(client),
    } as never);

    const result = await service.rotateRefreshToken({
      currentToken: "current-token",
      expectedUserId: "user-1",
      nextExpiresAt: new Date(Date.now() + 120_000),
      nextToken: "next-token",
    });

    expect(result).toEqual({
      email: "ada@example.com",
      id: "user-1",
      name: "Ada Lovelace",
    });
    expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(client.query).toHaveBeenNthCalledWith(6, "COMMIT");
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
