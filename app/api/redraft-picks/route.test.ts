import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import { getDraftDbClient } from "@/lib/draft-db";
import {
  loadNba2kRosterPlayers,
  ensureNba2kRosterSchema
} from "@/lib/nba2k-roster-db";
import {
  ensureFranchiseSelectionSchema,
  loadFranchiseSelections,
  seedGmDraftSlots
} from "@/lib/franchise-db";
import {
  ensureRedraftPickSchema,
  loadRedraftPicks,
  upsertRedraftPick
} from "@/lib/redraft-picks";
import { GET, PATCH } from "./route";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers())
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn()
    }
  }
}));

vi.mock("@/lib/draft-db", () => ({
  getDraftDbClient: vi.fn()
}));

vi.mock("@/lib/franchise-db", () => ({
  ensureFranchiseSelectionSchema: vi.fn(),
  loadFranchiseSelections: vi.fn(),
  seedGmDraftSlots: vi.fn()
}));

vi.mock("@/lib/nba2k-roster-db", () => ({
  ensureNba2kRosterSchema: vi.fn(),
  loadNba2kRosterPlayers: vi.fn()
}));

vi.mock("@/lib/redraft-picks", () => ({
  ensureRedraftPickSchema: vi.fn(),
  loadRedraftPicks: vi.fn(),
  upsertRedraftPick: vi.fn()
}));

const db = {
  query: vi.fn(async () => [{ id: "user-7", email: "chris@nba2kfl.local" }])
};
const selections = [
  { slot: 7, gmName: "Chris", teamId: "sas" },
  { slot: 8, gmName: "Akuma", teamId: "den" }
];
const players = [
  {
    sourcePlayerId: 1,
    fullName: "Victor Wembanyama",
    position: "C",
    rating: 95,
    teamId: "sas",
    teamName: "San Antonio Spurs"
  }
];

describe("redraft picks API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ADMIN_EMAILS;
    vi.mocked(getDraftDbClient).mockReturnValue(db);
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { email: "chris@nba2kfl.local", name: "Chris" }
    });
    vi.mocked(loadFranchiseSelections).mockResolvedValue(selections);
    vi.mocked(loadNba2kRosterPlayers).mockResolvedValue(players);
    vi.mocked(loadRedraftPicks).mockResolvedValue({});
  });

  it("loads current redraft picks", async () => {
    vi.mocked(loadRedraftPicks).mockResolvedValue({ 1: "Nikola Jokic" });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ picks: { 1: "Nikola Jokic" } });
    expect(ensureFranchiseSelectionSchema).toHaveBeenCalledWith(db);
    expect(seedGmDraftSlots).toHaveBeenCalledWith(db);
    expect(ensureNba2kRosterSchema).toHaveBeenCalledWith(db);
    expect(ensureRedraftPickSchema).toHaveBeenCalledWith(db);
  });

  it("persists a selected player for the signed-in GM current pick", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/redraft-picks", {
        body: JSON.stringify({ pickNumber: 1, playerName: "Victor Wembanyama" }),
        method: "PATCH"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ picks: {} });
    expect(upsertRedraftPick).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        pickNumber: 1,
        selection: expect.objectContaining({ slot: 7, teamId: "sas" })
      }),
      players[0],
      "user-7"
    );
  });

  it("rejects player updates from a GM who does not own the current pick", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { email: "akuma@nba2kfl.local", name: "Akuma" }
    });
    db.query.mockResolvedValueOnce([{ id: "user-8", email: "akuma@nba2kfl.local" }]);

    const response = await PATCH(
      new Request("http://localhost/api/redraft-picks", {
        body: JSON.stringify({ pickNumber: 1, playerName: "Victor Wembanyama" }),
        method: "PATCH"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toEqual({ error: "Ce pick ne vous appartient pas." });
    expect(upsertRedraftPick).not.toHaveBeenCalled();
  });

  it("allows admins to update the current pick for any GM slot", async () => {
    process.env.ADMIN_EMAILS = "admin@nba2kfl.local";
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { email: "admin@nba2kfl.local", name: "Admin" }
    });
    db.query.mockResolvedValueOnce([
      { id: "admin-user", email: "admin@nba2kfl.local" }
    ]);

    const response = await PATCH(
      new Request("http://localhost/api/redraft-picks", {
        body: JSON.stringify({ pickNumber: 1, playerName: "Victor Wembanyama" }),
        method: "PATCH"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ picks: {} });
    expect(upsertRedraftPick).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        pickNumber: 1,
        selection: expect.objectContaining({ slot: 7, teamId: "sas" })
      }),
      players[0],
      "admin-user"
    );
  });
});
