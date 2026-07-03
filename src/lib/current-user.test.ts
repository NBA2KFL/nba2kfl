import { describe, expect, it, vi } from "vitest";
import type { DraftDbClient } from "./draft-db";
import {
  AuthRequiredError,
  ForbiddenUserError,
  resolveCurrentUser
} from "./current-user";

describe("resolveCurrentUser", () => {
  it("requires a signed-in Stack user", async () => {
    const db = createDbClient();

    await expect(resolveCurrentUser(db, null)).rejects.toBeInstanceOf(
      AuthRequiredError
    );
    expect(db.query).not.toHaveBeenCalled();
  });

  it("requires a primary email on the Stack user", async () => {
    const db = createDbClient();

    await expect(
      resolveCurrentUser(db, { displayName: "Anna", primaryEmail: null })
    ).rejects.toBeInstanceOf(ForbiddenUserError);
    expect(db.query).not.toHaveBeenCalled();
  });

  it("rejects users that are not linked in Neon auth", async () => {
    const db = createDbClient([[]]);

    await expect(
      resolveCurrentUser(db, {
        displayName: "Anna",
        primaryEmail: "anna@nba2kfl.local"
      })
    ).rejects.toBeInstanceOf(ForbiddenUserError);
  });

  it("normalizes the email and returns the linked Neon user", async () => {
    const db = createDbClient([[{ id: "user-1", email: "anna@nba2kfl.local" }]]);

    await expect(
      resolveCurrentUser(db, {
        displayName: "Anna",
        primaryEmail: "ANNA@NBA2KFL.LOCAL"
      })
    ).resolves.toEqual({
      userId: "user-1",
      email: "anna@nba2kfl.local",
      displayName: "Anna"
    });
  });
});

function createDbClient(rowsByCall: Record<string, unknown>[][] = []): DraftDbClient {
  return {
    query: vi.fn().mockImplementation(() => Promise.resolve(rowsByCall.shift() ?? []))
  };
}
