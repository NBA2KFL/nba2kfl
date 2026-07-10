import { describe, expect, it, vi } from "vitest";
import type { DraftDbClient } from "./draft-db";
import {
  claimRedraftRoundRecap,
  ensureRedraftRoundRecapSchema,
  loadPendingRedraftRounds,
  markRedraftRoundRecapSent
} from "./redraft-round-recaps";

describe("redraft round recap persistence", () => {
  it("creates an idempotent round status table", async () => {
    const db = createDbClient();
    await ensureRedraftRoundRecapSchema(db);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("CREATE TABLE IF NOT EXISTS redraft_round_recaps"));
  });

  it("claims only pending rounds and marks them sent", async () => {
    const db = createDbClient([[{ round: 1 }]]);
    await expect(claimRedraftRoundRecap(db, 1)).resolves.toBe(true);
    await markRedraftRoundRecapSent(db, 1);
    expect(db.query).toHaveBeenLastCalledWith(expect.stringContaining("UPDATE redraft_round_recaps"), [1]);
  });

  it("loads pending rounds in order", async () => {
    const db = createDbClient([[{ round: 2 }, { round: 1 }]]);
    await expect(loadPendingRedraftRounds(db)).resolves.toEqual([2, 1]);
  });
});

function createDbClient(results: Record<string, unknown>[][] = []): DraftDbClient {
  let index = 0;
  return { query: vi.fn(async () => results[index++] ?? []) };
}
