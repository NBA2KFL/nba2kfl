import { describe, expect, it, vi } from "vitest";
import type { DraftDbClient } from "./draft-db";
import {
  ensureNba2kRosterSchema,
  loadNba2kRosterPlayers,
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

  it("loads roster players for redraft sorted by rating and name", async () => {
    const db = createDbClient([
      [
        {
          source_player_id: 2,
          full_name: "Jalen Brunson",
          position: "PG",
          rating: 93,
          team_id: "nyk",
          team_name: "New York Knicks"
        },
        {
          source_player_id: 1,
          full_name: "Joel Embiid",
          position: "C",
          rating: 92,
          team_id: "phi",
          team_name: "Philadelphia 76ers"
        }
      ]
    ]);

    const players = await loadNba2kRosterPlayers(db);
    const [queryText] = vi.mocked(db.query).mock.calls[0];

    expect(queryText).toContain("FROM nba2k_roster_players");
    expect(queryText).toContain("ORDER BY rating DESC, full_name ASC");
    expect(players.slice(0, 2)).toEqual([
      {
        sourcePlayerId: 2,
        fullName: "Jalen Brunson",
        position: "PG",
        rating: 93,
        teamId: "nyk",
        teamName: "New York Knicks"
      },
      {
        sourcePlayerId: 1,
        fullName: "Joel Embiid",
        position: "C",
        rating: 92,
        teamId: "phi",
        teamName: "Philadelphia 76ers"
      }
    ]);
  });

  it("adds the 2026 draft class to roster players and avoids duplicate names", async () => {
    const db = createDbClient([
      [
        {
          source_player_id: 1,
          full_name: "Nikola Jokic",
          position: "C",
          rating: 98,
          team_id: "den",
          team_name: "Denver Nuggets"
        },
        {
          source_player_id: 2,
          full_name: "AJ Dybantsa",
          position: "SF",
          rating: 83,
          team_id: "was",
          team_name: "Washington Wizards"
        }
      ]
    ]);

    const players = await loadNba2kRosterPlayers(db);
    const draftClassPlayers = players.filter(
      (player) => player.sourcePlayerId <= -2026001
    );

    expect(players[0]).toEqual({
      sourcePlayerId: 1,
      fullName: "Nikola Jokic",
      position: "C",
      rating: 98,
      teamId: "den",
      teamName: "Denver Nuggets"
    });
    expect(players.filter((player) => player.fullName === "AJ Dybantsa")).toEqual([
      {
        sourcePlayerId: 2,
        fullName: "AJ Dybantsa",
        position: "SF",
        rating: 83,
        teamId: "was",
        teamName: "Washington Wizards"
      }
    ]);
    expect(draftClassPlayers).toHaveLength(59);
    expect(players).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fullName: "Darryn Peterson",
          position: "SG/PG",
          rating: 78,
          teamId: "uta"
        }),
        expect.objectContaining({
          fullName: "Cameron Boozer",
          position: "PF",
          rating: 77,
          teamId: "mem"
        }),
        expect.objectContaining({
          fullName: "Malique Lewis",
          position: "SF",
          rating: 67,
          teamId: "mil"
        })
      ])
    );
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
  const query = vi.fn(
    async <T extends Record<string, unknown> = Record<string, unknown>>(
      _queryText: string,
      _params?: unknown[]
    ) => (results[callIndex++] ?? []) as T[]
  );

  return {
    query: query as DraftDbClient["query"]
  };
}
