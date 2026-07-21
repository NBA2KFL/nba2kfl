import { describe, expect, it, vi } from "vitest";
import type { DraftDbClient } from "./draft-db";
import {
  ensurePlayerContractSchema,
  loadPlayerContracts,
  normalizeNameForContractMatch,
  normalizePlayerContract,
  parsePlayerContractsPayload,
  upsertPlayerContracts
} from "./player-contracts-db";

describe("normalizeNameForContractMatch", () => {
  it("matches initials written with or without periods", () => {
    expect(normalizeNameForContractMatch("R.J. Barrett")).toBe(
      normalizeNameForContractMatch("RJ Barrett")
    );
    expect(normalizeNameForContractMatch("C.J. McCollum")).toBe(
      normalizeNameForContractMatch("CJ McCollum")
    );
  });

  it("ignores generational suffixes", () => {
    expect(normalizeNameForContractMatch("Bobby Portis")).toBe(
      normalizeNameForContractMatch("Bobby Portis Jr")
    );
    expect(normalizeNameForContractMatch("Xavier Tillman")).toBe(
      normalizeNameForContractMatch("Xavier Tillman Sr")
    );
    expect(normalizeNameForContractMatch("Ron Holland")).toBe(
      normalizeNameForContractMatch("Ron Holland II")
    );
  });

  it("resolves known nickname aliases to their Spotrac display name", () => {
    expect(normalizeNameForContractMatch("Alexandre Sarr")).toBe(
      normalizeNameForContractMatch("Alex Sarr")
    );
    expect(normalizeNameForContractMatch("Carlton Carrington")).toBe(
      normalizeNameForContractMatch("Bub Carrington")
    );
    expect(normalizeNameForContractMatch("Cam Christie")).toBe(
      normalizeNameForContractMatch("Cameron Christie")
    );
    expect(normalizeNameForContractMatch("Herbert Jones")).toBe(
      normalizeNameForContractMatch("Herb Jones")
    );
  });

  it("does not conflate different people who share a surname", () => {
    expect(normalizeNameForContractMatch("LeBron James")).not.toBe(
      normalizeNameForContractMatch("Bronny James")
    );
  });

  it("still distinguishes genuinely different names", () => {
    expect(normalizeNameForContractMatch("Jayson Tatum")).not.toBe(
      normalizeNameForContractMatch("Jaylen Brown")
    );
  });
});

describe("player contract persistence", () => {
  it("normalizes a scraped player contract's seasons", () => {
    const contract = normalizePlayerContract({
      spotracId: "23598",
      teamId: "bos",
      name: "Jayson Tatum",
      position: "PF",
      seasons: [
        { season: 2025, age: 27, status: null, capHit: 54126450 },
        { season: 2030, age: 32, status: "UFA", capHit: null }
      ]
    });

    expect(contract).toEqual({
      sourcePlayerId: "23598",
      teamId: "bos",
      fullName: "Jayson Tatum",
      position: "PF",
      seasons: [
        { season: 2025, age: 27, status: null, capHit: 54126450 },
        { season: 2030, age: 32, status: "UFA", capHit: null }
      ]
    });
  });

  it("rejects a payload that isn't an array", () => {
    expect(() => parsePlayerContractsPayload({})).toThrow(
      "Player contracts source returned an invalid payload."
    );
  });

  it("creates the player contracts table and lookup indexes", async () => {
    const db = createDbClient();

    await ensurePlayerContractSchema(db);

    expect(db.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("CREATE TABLE IF NOT EXISTS player_contracts")
    );
    expect(db.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("player_contracts_source_key")
    );
    expect(db.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("player_contracts_team_idx")
    );
  });

  it("upserts normalized contracts as a jsonb batch", async () => {
    const db = createDbClient([[{ imported_players: 2 }]]);

    const result = await upsertPlayerContracts(db, [
      {
        spotracId: "23598",
        teamId: "bos",
        name: "Jayson Tatum",
        position: "PF",
        seasons: [{ season: 2025, age: 27, status: null, capHit: 54126450 }]
      },
      {
        spotracId: "23617",
        teamId: "cle",
        name: "Jarrett Allen",
        position: "C",
        seasons: [{ season: 2026, age: 28, status: null, capHit: 28000000 }]
      }
    ]);

    const [queryText, params] = vi.mocked(db.query).mock.calls[0];
    const payload = JSON.parse(params?.[0] as string);

    expect(result).toEqual({ importedPlayers: 2 });
    expect(queryText).toContain("jsonb_to_recordset($1::jsonb)");
    expect(queryText).toContain("ON CONFLICT (source, source_player_id)");
    expect(payload).toEqual([
      expect.objectContaining({
        source: "spotrac",
        sourcePlayerId: "23598",
        teamId: "bos",
        fullName: "Jayson Tatum"
      }),
      expect.objectContaining({
        source: "spotrac",
        sourcePlayerId: "23617",
        teamId: "cle",
        fullName: "Jarrett Allen"
      })
    ]);
  });

  it("dedupes repeated source player ids before upserting", async () => {
    const db = createDbClient([[{ imported_players: 1 }]]);

    await upsertPlayerContracts(db, [
      {
        spotracId: "23617",
        teamId: "cle",
        name: "Jarrett Allen",
        position: "C",
        seasons: [{ season: 2026, age: 28, status: null, capHit: 28000000 }]
      },
      {
        spotracId: "23617",
        teamId: "cle",
        name: "Jarrett Allen",
        position: "C",
        seasons: [{ season: 2026, age: 28, status: null, capHit: 28000000 }]
      }
    ]);

    const [, params] = vi.mocked(db.query).mock.calls[0];
    const payload = JSON.parse(params?.[0] as string);

    expect(payload).toHaveLength(1);
  });

  it("loads persisted contracts sorted by player name", async () => {
    const db = createDbClient([
      [
        {
          source_player_id: "23617",
          team_id: "cle",
          full_name: "Jarrett Allen",
          position: "C",
          seasons: [{ season: 2026, age: 28, status: null, capHit: 28000000 }]
        },
        {
          source_player_id: "23598",
          team_id: "bos",
          full_name: "Jayson Tatum",
          position: "PF",
          seasons: [{ season: 2025, age: 27, status: null, capHit: 54126450 }]
        }
      ]
    ]);

    const contracts = await loadPlayerContracts(db);

    expect(contracts).toEqual([
      expect.objectContaining({ fullName: "Jarrett Allen" }),
      expect.objectContaining({ fullName: "Jayson Tatum" })
    ]);
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
