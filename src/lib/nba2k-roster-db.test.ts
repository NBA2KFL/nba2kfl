import { describe, expect, it, vi } from "vitest";
import type { DraftDbClient } from "./draft-db";
import {
  ensureNba2kRosterSchema,
  normalizeNba2kRosterPlayer,
  parseNba2kRosterSourcePayload,
  upsertNba2kRosterPlayers
} from "./nba2k-roster-db";

describe("NBA 2K roster persistence", () => {
  it("normalizes NBA2KLab players to local team ids and keeps attribute ratings", () => {
    const player = normalizeNba2kRosterPlayer({
      id: 42,
      first_name: "Kawhi",
      last_name: "Leonard",
      team: "Los Angeles Clippers",
      position: "SF",
      rating: 92,
      height: "6'7",
      weight: 225,
      wingspan: "7'3",
      age: 34,
      pot: "A",
      mid: 93,
      "3pt": 86,
      pdef: 92
    });

    expect(player).toEqual({
      gameVersion: "nba2k26",
      source: "nba2klab",
      sourcePlayerId: 42,
      teamId: "lac",
      teamName: "Los Angeles Clippers",
      firstName: "Kawhi",
      lastName: "Leonard",
      fullName: "Kawhi Leonard",
      position: "SF",
      rating: 92,
      height: "6'7",
      weight: 225,
      wingspan: "7'3",
      age: 34,
      potential: "A",
      attributes: {
        "3pt": 86,
        mid: 93,
        pdef: 92
      },
      sourceUrl: "https://www.nba2klab.com/.netlify/functions/player-roster"
    });
  });

  it("creates the NBA 2K roster table and lookup indexes", async () => {
    const db = createDbClient();

    await ensureNba2kRosterSchema(db);

    expect(db.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("CREATE TABLE IF NOT EXISTS nba2k_roster_players")
    );
    expect(db.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("nba2k_roster_players_source_key")
    );
    expect(db.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("nba2k_roster_players_team_rating_idx")
    );
  });

  it("upserts normalized players as a jsonb batch", async () => {
    const db = createDbClient([[{ imported_players: 2 }]]);

    const result = await upsertNba2kRosterPlayers(db, [
      {
        id: 1,
        first_name: "Joel",
        last_name: "Embiid",
        team: "Philadelphia 76ers",
        position: "C",
        rating: 92,
        close: 96
      },
      {
        id: 2,
        first_name: "Jalen",
        last_name: "Brunson",
        team: "New York Knicks",
        position: "PG",
        rating: 93,
        ball: 95
      }
    ]);

    const [queryText, params] = vi.mocked(db.query).mock.calls[0];
    const payload = JSON.parse(params?.[0] as string);

    expect(result).toEqual({ importedPlayers: 2 });
    expect(queryText).toContain("jsonb_to_recordset($1::jsonb)");
    expect(queryText).toContain("ON CONFLICT (game_version, source, source_player_id)");
    expect(payload).toEqual([
      expect.objectContaining({
        sourcePlayerId: 1,
        teamId: "phi",
        fullName: "Joel Embiid",
        rating: 92,
        attributes: { close: 96 }
      }),
      expect.objectContaining({
        sourcePlayerId: 2,
        teamId: "nyk",
        fullName: "Jalen Brunson",
        rating: 93,
        attributes: { ball: 95 }
      })
    ]);
  });

  it("accepts only array payloads from the roster source", () => {
    const payload = [{ id: 1, first_name: "Joel" }];

    expect(parseNba2kRosterSourcePayload(payload)).toBe(payload);
    expect(() => parseNba2kRosterSourcePayload({ data: payload })).toThrow(
      "NBA 2K roster source returned an invalid payload."
    );
  });
});

function createDbClient(results: Record<string, unknown>[][] = []): DraftDbClient {
  let callIndex = 0;

  return {
    query: vi.fn(async () => results[callIndex++] ?? [])
  };
}
