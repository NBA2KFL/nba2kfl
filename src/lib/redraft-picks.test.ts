import { describe, expect, it, vi } from "vitest";
import type { DraftDbClient } from "./draft-db";
import type { Nba2kRosterPlayerSummary } from "./nba2k-roster-db";
import type { SnakeDraftPick } from "./redraft";
import {
  clearRedraftPick,
  ensureRedraftPickSchema,
  loadRedraftPickRecap,
  loadRedraftPicks,
  upsertRedraftPick
} from "./redraft-picks";

const pick: SnakeDraftPick = {
  pickNumber: 7,
  round: 1,
  roundPick: 7,
  selection: {
    slot: 7,
    gmName: "Chris",
    teamId: "sas"
  }
};

const player: Nba2kRosterPlayerSummary = {
  sourcePlayerId: 1,
  fullName: "Victor Wembanyama",
  position: "C",
  rating: 95,
  teamId: "sas",
  teamName: "San Antonio Spurs"
};

describe("redraft picks persistence", () => {
  it("creates the redraft picks table with unique player assignments", async () => {
    const db = createDbClient();

    await ensureRedraftPickSchema(db);

    expect(db.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("CREATE TABLE IF NOT EXISTS redraft_picks")
    );
    expect(db.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("redraft_picks_player_key")
    );
  });

  it("loads selected players by pick number", async () => {
    const db = createDbClient([
      [
        { pick_number: 1, player_name: "Nikola Jokic" },
        { pick_number: 2, player_name: "Shai Gilgeous-Alexander" }
      ]
    ]);

    await expect(loadRedraftPicks(db)).resolves.toEqual({
      1: "Nikola Jokic",
      2: "Shai Gilgeous-Alexander"
    });
  });

  it("loads ordered redraft recap details", async () => {
    const validatedAt = "2026-07-10T10:00:00.000Z";
    const db = createDbClient([
      [
        {
          pick_number: 7,
          round: 1,
          round_pick: 7,
          slot: 7,
          franchise_team_id: "sas",
          player_name: "Victor Wembanyama",
          nba_player_id: 1641705,
          updated_at: validatedAt
        }
      ]
    ]);

    await expect(loadRedraftPickRecap(db)).resolves.toEqual([
      {
        pickNumber: 7,
        round: 1,
        roundPick: 7,
        slot: 7,
        franchiseTeamId: "sas",
        playerName: "Victor Wembanyama",
        nbaPlayerId: 1641705,
        validatedAt
      }
    ]);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("ORDER BY redraft.pick_number")
    );
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("LEFT JOIN nba2k_roster_players")
    );
  });

  it("stores a selected player against the drafted franchise slot", async () => {
    const db = createDbClient();

    await upsertRedraftPick(db, pick, player, "user-7");

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO redraft_picks"),
      [
        7,
        1,
        7,
        7,
        "sas",
        1,
        "Victor Wembanyama",
        "user-7"
      ]
    );
  });

  it("clears one pick when a selected player is removed", async () => {
    const db = createDbClient();

    await clearRedraftPick(db, 7);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM redraft_picks"),
      [7]
    );
  });
});

function createDbClient(results: Record<string, unknown>[][] = []): DraftDbClient {
  let callIndex = 0;

  return {
    query: vi.fn(async () => results[callIndex++] ?? [])
  };
}
