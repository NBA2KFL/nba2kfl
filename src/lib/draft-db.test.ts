import { describe, expect, it, vi } from "vitest";
import { NBA_TEAMS } from "@/data/teams";
import {
  clearLatestDraftSimulation,
  ensureDraftSimulationSchema,
  loadLatestDraftSimulation,
  saveLatestDraftSimulation,
  type DraftDbClient
} from "./draft-db";

describe("draft database persistence", () => {
  it("creates the draft simulation table if needed", async () => {
    const db = createDbClient([]);

    await ensureDraftSimulationSchema(db);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS draft_simulations")
    );
  });

  it("upserts the latest draft simulation as team ids and timestamp", async () => {
    const db = createDbClient([]);
    const lastRunAt = new Date("2026-07-02T18:30:00.000Z");

    await saveLatestDraftSimulation(db, NBA_TEAMS, lastRunAt);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("ON CONFLICT"),
      [
        "latest",
        JSON.stringify({ teamIds: NBA_TEAMS.map((team) => team.id) }),
        lastRunAt.toISOString()
      ]
    );
  });

  it("restores the latest draft simulation from the database payload", async () => {
    const lastRunAt = new Date("2026-07-02T18:30:00.000Z");
    const db = createDbClient([
      {
        last_run_at: lastRunAt,
        payload: { teamIds: NBA_TEAMS.map((team) => team.id) }
      }
    ]);

    const restored = await loadLatestDraftSimulation(db, NBA_TEAMS);

    expect(restored?.draftOrder.map((team) => team.id)).toEqual(
      NBA_TEAMS.map((team) => team.id)
    );
    expect(restored?.lastRunAt.toISOString()).toBe(lastRunAt.toISOString());
  });

  it("clears the latest draft simulation", async () => {
    const db = createDbClient([]);

    await clearLatestDraftSimulation(db);

    expect(db.query).toHaveBeenCalledWith(
      "DELETE FROM draft_simulations WHERE id = $1",
      ["latest"]
    );
  });
});

function createDbClient(rows: Record<string, unknown>[]): DraftDbClient {
  return {
    query: vi.fn().mockResolvedValue(rows)
  };
}
