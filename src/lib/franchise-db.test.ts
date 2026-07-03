import { describe, expect, it, vi } from "vitest";
import { NBA_TEAMS } from "@/data/teams";
import type { DraftDbClient } from "./draft-db";
import {
  clearFranchiseSelections,
  ensureFranchiseSelectionSchema,
  loadFranchiseSelections,
  seedGmDraftSlots,
  updateFranchiseSelection
} from "./franchise-db";
import { GM_DRAFT_SLOT_LINKS } from "./redraft";

const TEAM_IDS = NBA_TEAMS.map((team) => team.id);

describe("franchise selection database persistence", () => {
  it("creates the GM draft slots table and unique team index", async () => {
    const db = createDbClient();

    await ensureFranchiseSelectionSchema(db);

    expect(db.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("CREATE TABLE IF NOT EXISTS gm_draft_slots")
    );
    expect(db.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("CREATE UNIQUE INDEX IF NOT EXISTS gm_draft_slots_team_id_key")
    );
  });

  it("seeds the 30 GM slots while preserving existing team choices", async () => {
    const db = createDbClient([[{ seeded_slots: 30, missing_users: 0 }]]);

    await seedGmDraftSlots(db);

    const [queryText, params] = vi.mocked(db.query).mock.calls[0];
    const payload = JSON.parse(params?.[0] as string);

    expect(queryText).toContain("ON CONFLICT (slot) DO UPDATE");
    expect(payload).toHaveLength(30);
    expect(payload[5]).toMatchObject({
      slot: 6,
      gmName: "Math",
      userEmail: "mat-presti@nba2kfl.local"
    });
  });

  it("fails seeding when an auth user link is missing", async () => {
    const db = createDbClient([[{ seeded_slots: 29, missing_users: 1 }]]);

    await expect(seedGmDraftSlots(db)).rejects.toThrow(
      "Unable to seed all GM draft slots"
    );
  });

  it("loads GM franchise selections from database rows", async () => {
    const db = createDbClient([createSelectionRows()]);

    const selections = await loadFranchiseSelections(db, TEAM_IDS);

    expect(selections).toHaveLength(30);
    expect(selections.slice(0, 3)).toEqual([
      { slot: 1, gmName: "Anna", teamId: NBA_TEAMS[0].id },
      { slot: 2, gmName: "Ellias", teamId: NBA_TEAMS[1].id },
      { slot: 3, gmName: "Nico 2e équipe", teamId: null }
    ]);
  });

  it("updates one slot with a valid selected franchise", async () => {
    const db = createDbClient([[{ slot: 1 }]]);

    await updateFranchiseSelection(db, 1, NBA_TEAMS[0].id, TEAM_IDS);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE gm_draft_slots"),
      [1, NBA_TEAMS[0].id]
    );
  });

  it("rejects invalid slots or team ids before writing", async () => {
    const db = createDbClient();

    await expect(updateFranchiseSelection(db, 31, NBA_TEAMS[0].id, TEAM_IDS)).rejects.toThrow(
      "Invalid GM draft slot"
    );
    await expect(updateFranchiseSelection(db, 1, "unknown", TEAM_IDS)).rejects.toThrow(
      "Invalid NBA team id"
    );
    expect(db.query).not.toHaveBeenCalled();
  });

  it("clears all selected franchises", async () => {
    const db = createDbClient();

    await clearFranchiseSelections(db);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE gm_draft_slots SET team_id = NULL")
    );
  });
});

function createSelectionRows() {
  return GM_DRAFT_SLOT_LINKS.map((slot) => ({
    slot: slot.slot,
    gm_name: slot.gmName,
    team_id:
      slot.slot === 1
        ? NBA_TEAMS[0].id
        : slot.slot === 2
          ? NBA_TEAMS[1].id
          : null
  }));
}

function createDbClient(rowsByCall: Record<string, unknown>[][] = []): DraftDbClient {
  return {
    query: vi.fn().mockImplementation(() => Promise.resolve(rowsByCall.shift() ?? []))
  };
}
