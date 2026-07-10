import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DraftDbClient } from "./draft-db";
import { fetchNbaPlayerDirectory } from "./nba-player-directory";
import {
  loadRosterPlayerIdentities,
  updateRosterNbaPlayerIds
} from "./nba2k-roster-db";
import { syncNbaPlayerIds } from "./nba-player-media-sync";

vi.mock("./nba-player-directory", async (importOriginal) => {
  const original = await importOriginal<typeof import("./nba-player-directory")>();

  return {
    ...original,
    fetchNbaPlayerDirectory: vi.fn()
  };
});

vi.mock("./nba2k-roster-db", () => ({
  loadRosterPlayerIdentities: vi.fn(),
  updateRosterNbaPlayerIds: vi.fn()
}));

const db = { query: vi.fn() } as unknown as DraftDbClient;

describe("NBA player media sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("matches roster names and updates their NBA ids", async () => {
    vi.mocked(loadRosterPlayerIdentities).mockResolvedValue([
      {
        sourcePlayerId: 400,
        fullName: "Victor Wembanyama",
        nbaPlayerId: null
      },
      {
        sourcePlayerId: -2026001,
        fullName: "AJ Dybantsa",
        nbaPlayerId: null
      }
    ]);
    vi.mocked(fetchNbaPlayerDirectory).mockResolvedValue([
      { nbaPlayerId: 1641705, fullName: "Victor Wembanyama" }
    ]);
    vi.mocked(updateRosterNbaPlayerIds).mockResolvedValue({
      updatedPlayers: 1
    });

    await expect(syncNbaPlayerIds(db)).resolves.toEqual({
      directoryPlayers: 1,
      matchedPlayers: 1,
      unmatchedPlayers: 1,
      updatedPlayers: 1
    });
    expect(updateRosterNbaPlayerIds).toHaveBeenCalledWith(db, [
      { sourcePlayerId: 400, nbaPlayerId: 1641705 }
    ]);
  });

  it("retains existing ids and reports an NBA directory failure", async () => {
    vi.mocked(fetchNbaPlayerDirectory).mockRejectedValue(
      new Error("NBA unavailable")
    );

    await expect(syncNbaPlayerIds(db)).resolves.toEqual({
      directoryPlayers: 0,
      matchedPlayers: 0,
      unmatchedPlayers: 0,
      updatedPlayers: 0,
      error: "NBA unavailable"
    });
    expect(loadRosterPlayerIdentities).not.toHaveBeenCalled();
    expect(updateRosterNbaPlayerIds).not.toHaveBeenCalled();
  });
});
