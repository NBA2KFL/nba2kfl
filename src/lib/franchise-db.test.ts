import { describe, expect, it, vi } from "vitest";
import { NBA_TEAMS } from "@/data/teams";
import type { DraftDbClient } from "./draft-db";
import {
  clearFranchiseSelections,
  clearFranchiseOwner,
  ensureFranchiseSelectionSchema,
  loadFranchiseOwnership,
  loadFranchiseSelections,
  setFranchiseOwner,
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
    expect(db.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("CREATE TABLE IF NOT EXISTS gm_franchises")
    );
    expect(db.query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining("gm_franchises_team_id_key")
    );
    expect(db.query).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining("gm_franchises_one_primary_per_user_key")
    );
    expect(db.query).toHaveBeenNthCalledWith(
      6,
      expect.stringContaining("released_existing_primary AS")
    );
    expect(db.query).toHaveBeenNthCalledWith(
      6,
      expect.stringContaining("UPDATE gm_franchises")
    );
    expect(db.query).toHaveBeenNthCalledWith(
      7,
      expect.stringContaining("INSERT INTO gm_franchises")
    );
    expect(db.query).toHaveBeenNthCalledWith(
      7,
      expect.stringContaining("ON CONFLICT (team_id) DO UPDATE")
    );
    expect(db.query).toHaveBeenNthCalledWith(
      7,
      expect.stringContaining("WHERE gm_franchises.source_slot IS NOT NULL")
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
      gmName: "Ashu de Metal",
      userEmail: "ashu@nba2kfl.local",
      teamId: "sac"
    });
    expect(payload[9]).toMatchObject({
      slot: 10,
      gmName: "Nicomunist 2e équipe",
      userEmail: "nicomunist@nba2kfl.local",
      teamId: "mil"
    });
    expect(payload[16]).toMatchObject({
      slot: 17,
      gmName: "nicotuyaux",
      userEmail: "nicotuyaux@nba2kfl.local",
      teamId: "uta"
    });
    expect(db.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("released_existing_primary AS")
    );
    expect(db.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("UPDATE gm_franchises")
    );
    expect(db.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("INSERT INTO gm_franchises")
    );
    expect(db.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("ON CONFLICT (team_id) DO UPDATE")
    );
    expect(db.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("WHERE gm_franchises.source_slot IS NOT NULL")
    );
  });

  it("allows partial seeding when an auth user link is missing", async () => {
    const db = createDbClient([[{ seeded_slots: 29, missing_users: 1 }]]);

    await expect(seedGmDraftSlots(db)).resolves.toBeUndefined();
  });

  it("loads configured final franchise selections", async () => {
    const db = createDbClient([createSelectionRows()]);

    const selections = await loadFranchiseSelections(db, TEAM_IDS);

    expect(selections).toHaveLength(30);
    expect(selections.slice(0, 3)).toEqual([
      { slot: 1, gmName: "Anna", teamId: "hou" },
      { slot: 2, gmName: "Elias", teamId: "ind" },
      { slot: 3, gmName: "Hadiya", teamId: "tor" }
    ]);
  });

  it("fills missing database rows from the configured final franchise choices", async () => {
    const db = createDbClient([
      [
        {
          slot: 1,
          gm_name: "Anna",
          team_id: "hou"
        }
      ]
    ]);

    const selections = await loadFranchiseSelections(db, TEAM_IDS);

    expect(selections).toHaveLength(30);
    expect(selections.slice(0, 3)).toEqual([
      { slot: 1, gmName: "Anna", teamId: "hou" },
      { slot: 2, gmName: "Elias", teamId: "ind" },
      { slot: 3, gmName: "Hadiya", teamId: "tor" }
    ]);
  });

  it("uses the configured final franchise choices over stale database team ids", async () => {
    const db = createDbClient([
      [
        {
          slot: 1,
          gm_name: "Anna",
          team_id: "bos"
        },
        {
          slot: 2,
          gm_name: "Elias",
          team_id: null
        }
      ]
    ]);

    const selections = await loadFranchiseSelections(db, TEAM_IDS);

    expect(selections.slice(0, 2)).toEqual([
      { slot: 1, gmName: "Anna", teamId: "hou" },
      { slot: 2, gmName: "Elias", teamId: "ind" }
    ]);
  });

  it("updates one slot with a valid selected franchise", async () => {
    const db = createDbClient([
      [{ slot: 1, user_id: "user-1", gm_name: "Anna", previous_team_id: null }],
      []
    ]);

    await updateFranchiseSelection(db, 1, NBA_TEAMS[0].id, TEAM_IDS);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE gm_draft_slots"),
      [1, NBA_TEAMS[0].id]
    );
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO gm_franchises"),
      ["user-1", NBA_TEAMS[0].id, "Équipe principale", true, 1]
    );
  });

  it("moves ownership when a slot changes franchises", async () => {
    const db = createDbClient([
      [
        {
          slot: 3,
          user_id: "user-nico",
          gm_name: "Nico 2e équipe",
          previous_team_id: NBA_TEAMS[0].id
        }
      ],
      [],
      []
    ]);

    await updateFranchiseSelection(db, 3, NBA_TEAMS[1].id, TEAM_IDS);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM gm_franchises"),
      [NBA_TEAMS[0].id]
    );
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO gm_franchises"),
      ["user-nico", NBA_TEAMS[1].id, "2e équipe", false, 3]
    );
  });

  it("marks numbered duplicate GM slots as second teams", async () => {
    const db = createDbClient([
      [
        {
          slot: 10,
          user_id: "user-tamarlin",
          gm_name: "Tamarlin 2",
          previous_team_id: null
        }
      ],
      []
    ]);

    await updateFranchiseSelection(db, 10, NBA_TEAMS[9].id, TEAM_IDS);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO gm_franchises"),
      ["user-tamarlin", NBA_TEAMS[9].id, "2e équipe", false, 10]
    );
  });

  it("removes ownership when a selected slot is cleared", async () => {
    const db = createDbClient([
      [
        {
          slot: 1,
          user_id: "user-1",
          gm_name: "Anna",
          previous_team_id: NBA_TEAMS[0].id
        }
      ],
      []
    ]);

    await updateFranchiseSelection(db, 1, null, TEAM_IDS);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM gm_franchises"),
      [NBA_TEAMS[0].id]
    );
    expect(db.query).not.toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO gm_franchises"),
      expect.any(Array)
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
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM gm_franchises WHERE source_slot IS NOT NULL")
    );
  });

  it("loads franchise ownership with draft slot history and owner options", async () => {
    const db = createDbClient([
      [
        {
          team_id: NBA_TEAMS[0].id,
          owner_user_id: "user-1",
          owner_email: "anna@nba2kfl.local",
          owner_name: "Anna",
          label: "Équipe principale",
          is_primary: true,
          draft_slot: 1,
          draft_gm_name: "Anna"
        },
        {
          team_id: NBA_TEAMS[1].id,
          owner_user_id: null,
          owner_email: null,
          owner_name: null,
          label: null,
          is_primary: null,
          draft_slot: null,
          draft_gm_name: null
        }
      ],
      [
        {
          user_id: "user-1",
          email: "anna@nba2kfl.local",
          display_name: "Anna"
        }
      ]
    ]);

    await expect(loadFranchiseOwnership(db, TEAM_IDS.slice(0, 2))).resolves.toEqual({
      franchises: [
        {
          teamId: NBA_TEAMS[0].id,
          owner: {
            userId: "user-1",
            email: "anna@nba2kfl.local",
            displayName: "Anna"
          },
          label: "Équipe principale",
          isPrimary: true,
          draftSlot: 1,
          draftGmName: "Anna"
        },
        {
          teamId: NBA_TEAMS[1].id,
          owner: null,
          label: null,
          isPrimary: false,
          draftSlot: null,
          draftGmName: null
        }
      ],
      ownerOptions: [
        {
          userId: "user-1",
          email: "anna@nba2kfl.local",
          displayName: "Anna"
        }
      ]
    });
  });

  it("sets long-term ownership without changing draft slots", async () => {
    const db = createDbClient([[], []]);

    await setFranchiseOwner(db, NBA_TEAMS[0].id, "user-1", "Équipe principale", true);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE gm_franchises SET is_primary = false"),
      ["user-1", NBA_TEAMS[0].id]
    );
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO gm_franchises"),
      ["user-1", NBA_TEAMS[0].id, "Équipe principale", true]
    );
    expect(
      vi.mocked(db.query).mock.calls.some(([queryText]) =>
        queryText.includes("UPDATE gm_draft_slots")
      )
    ).toBe(false);
  });

  it("clears long-term ownership without changing draft slots", async () => {
    const db = createDbClient();

    await clearFranchiseOwner(db, NBA_TEAMS[0].id);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM gm_franchises"),
      [NBA_TEAMS[0].id]
    );
    expect(
      vi.mocked(db.query).mock.calls.some(([queryText]) =>
        queryText.includes("UPDATE gm_draft_slots")
      )
    ).toBe(false);
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
