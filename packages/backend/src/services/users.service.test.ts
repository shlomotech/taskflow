import { describe, expect, it, vi } from "vitest";
import { PostgresUsersService } from "./users.service.js";

describe("PostgresUsersService", () => {
  it("maps a database row into the current user response shape", async () => {
    const service = new PostgresUsersService({
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            avatar: "https://cdn.example.com/ada.png",
            created_at: new Date("2026-04-02T18:00:00.000Z"),
            email: "ada@example.com",
            id: "user-1",
            name: "Ada Lovelace",
          },
        ],
      }),
    } as never);

    await expect(service.getCurrentUser("user-1")).resolves.toEqual({
      avatar: "https://cdn.example.com/ada.png",
      createdAt: "2026-04-02T18:00:00.000Z",
      email: "ada@example.com",
      id: "user-1",
      name: "Ada Lovelace",
    });
  });

  it("updates only the provided columns and stamps updated_at", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          avatar: null,
          created_at: new Date("2026-04-02T18:00:00.000Z"),
          email: "ada@example.com",
          id: "user-1",
          name: "Augusta Ada",
        },
      ],
    });
    const service = new PostgresUsersService({
      query,
    } as never);

    await expect(
      service.updateCurrentUser("user-1", {
        avatar: null,
        name: "Augusta Ada",
      }),
    ).resolves.toEqual({
      avatar: null,
      createdAt: "2026-04-02T18:00:00.000Z",
      email: "ada@example.com",
      id: "user-1",
      name: "Augusta Ada",
    });

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain("name = $2");
    expect(query.mock.calls[0][0]).toContain("avatar = $3");
    expect(query.mock.calls[0][0]).toContain("updated_at = NOW()");
    expect(query.mock.calls[0][1]).toEqual(["user-1", "Augusta Ada", null]);
  });

  it("throws USER_NOT_FOUND when the user does not exist", async () => {
    const service = new PostgresUsersService({
      query: vi.fn().mockResolvedValue({
        rows: [],
      }),
    } as never);

    await expect(service.getCurrentUser("missing-user")).rejects.toMatchObject({
      code: "USER_NOT_FOUND",
      statusCode: 404,
    });
  });
});
