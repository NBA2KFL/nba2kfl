import { describe, expect, it } from "vitest";
import { NBA_TEAMS } from "@/data/teams";
import {
  createDraftSlots,
  createSnakeDraftPicks,
  DEFAULT_GM_DRAFT_ORDER,
  GM_DRAFT_SLOT_LINKS,
  parseFranchiseSelections,
  validateRedraftPickChange,
  type FranchiseSelection
} from "./redraft";

const selections: FranchiseSelection[] = [
  {
    slot: 1,
    gmName: "GM A",
    teamId: NBA_TEAMS[0].id
  },
  {
    slot: 2,
    gmName: "GM B",
    teamId: NBA_TEAMS[1].id
  },
  {
    slot: 3,
    gmName: "GM C",
    teamId: NBA_TEAMS[2].id
  }
];

describe("createDraftSlots", () => {
  it("links the 30 GM draft slots to the 25 auth users", () => {
    expect(GM_DRAFT_SLOT_LINKS).toHaveLength(30);
    expect(
      new Set(GM_DRAFT_SLOT_LINKS.map((slot) => slot.userEmail))
    ).toHaveLength(25);
    expect(GM_DRAFT_SLOT_LINKS[2]).toMatchObject({
      gmName: "Nico 2e équipe",
      userName: "Nico",
      userEmail: "nico@nba2kfl.local"
    });
    expect(GM_DRAFT_SLOT_LINKS[3]).toMatchObject({
      gmName: "Clem 2e équipe",
      userName: "Clem",
      userEmail: "clem@nba2kfl.local"
    });
    expect(GM_DRAFT_SLOT_LINKS[5]).toMatchObject({
      gmName: "Math",
      userName: "Mat Presti",
      userEmail: "mat-presti@nba2kfl.local"
    });
    expect(GM_DRAFT_SLOT_LINKS[28]).toMatchObject({
      gmName: "Mat 2e équipe",
      userName: "Mat Presti",
      userEmail: "mat-presti@nba2kfl.local"
    });
  });

  it("uses the configured NBA2KFL GM draft order by default", () => {
    const slots = createDraftSlots();

    expect(slots).toHaveLength(30);
    expect(slots.map((slot) => slot.gmName)).toEqual([
      "Anna",
      "Ellias",
      "Nico 2e équipe",
      "Clem 2e équipe",
      "Chris",
      "Math",
      "Teepi",
      "Akuma",
      "Tony",
      "Adito",
      "Tamarlin",
      "Tamarlin 2e équipe",
      "Tony 2e équipe",
      "Paul",
      "Tomasninho",
      "Nico",
      "Enzo",
      "Sam",
      "ASL",
      "Khaladan",
      "Masai",
      "Diane",
      "Tidwa",
      "Laiku",
      "Nortalis",
      "Romback",
      "Sparky",
      "Clem",
      "Mat 2e équipe",
      "Naoufel"
    ]);
    expect(DEFAULT_GM_DRAFT_ORDER).toHaveLength(30);
  });

  it("falls back to numbered names after the configured order", () => {
    const slots = createDraftSlots(31);

    expect(slots[30]).toEqual({ slot: 31, gmName: "GM 31", teamId: null });
  });
});

describe("createSnakeDraftPicks", () => {
  it("alternates between normal and reversed order each round", () => {
    const picks = createSnakeDraftPicks(selections, 3);

    expect(
      picks.map((pick) => ({
        pickNumber: pick.pickNumber,
        round: pick.round,
        roundPick: pick.roundPick,
        slot: pick.selection.slot,
        gmName: pick.selection.gmName
      }))
    ).toEqual([
      { pickNumber: 1, round: 1, roundPick: 1, slot: 1, gmName: "GM A" },
      { pickNumber: 2, round: 1, roundPick: 2, slot: 2, gmName: "GM B" },
      { pickNumber: 3, round: 1, roundPick: 3, slot: 3, gmName: "GM C" },
      { pickNumber: 4, round: 2, roundPick: 1, slot: 3, gmName: "GM C" },
      { pickNumber: 5, round: 2, roundPick: 2, slot: 2, gmName: "GM B" },
      { pickNumber: 6, round: 2, roundPick: 3, slot: 1, gmName: "GM A" },
      { pickNumber: 7, round: 3, roundPick: 1, slot: 1, gmName: "GM A" },
      { pickNumber: 8, round: 3, roundPick: 2, slot: 2, gmName: "GM B" },
      { pickNumber: 9, round: 3, roundPick: 3, slot: 3, gmName: "GM C" }
    ]);
  });

  it("ignores unassigned franchise slots", () => {
    const picks = createSnakeDraftPicks(
      [...selections, { slot: 4, gmName: "GM D", teamId: null }],
      2
    );

    expect(picks).toHaveLength(6);
    expect(picks.every((pick) => pick.selection.teamId)).toBe(true);
  });
});

describe("validateRedraftPickChange", () => {
  const draftPicks = createSnakeDraftPicks(selections, 2);
  const playerPool = ["Joueur 1", "Joueur 2", "Joueur 3"];

  it("accepts only valid current-pick player choices", () => {
    expect(
      validateRedraftPickChange({
        draftPicks,
        pickNumber: 1,
        picksByNumber: {},
        playerName: "Joueur 1",
        playerPool
      })
    ).toEqual({ valid: true, playerName: "Joueur 1" });

    expect(
      validateRedraftPickChange({
        draftPicks,
        pickNumber: 2,
        picksByNumber: {},
        playerName: "Joueur 2",
        playerPool
      })
    ).toEqual({ valid: false, message: "Valide d'abord le pick #1." });

    expect(
      validateRedraftPickChange({
        draftPicks,
        pickNumber: 2,
        picksByNumber: { 1: "Joueur 1" },
        playerName: "Joueur 1",
        playerPool
      })
    ).toEqual({ valid: false, message: "Ce joueur est deja pris." });

    expect(
      validateRedraftPickChange({
        draftPicks,
        pickNumber: 2,
        picksByNumber: { 1: "Joueur 1" },
        playerName: "Joueur inconnu",
        playerPool
      })
    ).toEqual({ valid: false, message: "Ce joueur n'est pas disponible." });
  });
});

describe("parseFranchiseSelections", () => {
  it("restores valid franchise team choices with locked GM names", () => {
    const restored = parseFranchiseSelections(
      JSON.stringify(selections),
      3,
      NBA_TEAMS.map((team) => team.id)
    );

    expect(restored).toEqual([
      { slot: 1, gmName: "Anna", teamId: NBA_TEAMS[0].id },
      { slot: 2, gmName: "Ellias", teamId: NBA_TEAMS[1].id },
      { slot: 3, gmName: "Nico 2e équipe", teamId: NBA_TEAMS[2].id }
    ]);
  });

  it("locks restored GM names to the configured draft order", () => {
    const restored = parseFranchiseSelections(
      JSON.stringify([{ ...selections[0], gmName: "Nom modifié" }]),
      1,
      NBA_TEAMS.map((team) => team.id)
    );

    expect(restored?.[0]?.gmName).toBe("Anna");
  });

  it("rejects incomplete, duplicate, or unknown franchise selections", () => {
    const teamIds = NBA_TEAMS.map((team) => team.id);

    expect(
      parseFranchiseSelections(JSON.stringify(selections.slice(1)), 3, teamIds)
    ).toBeNull();
    expect(
      parseFranchiseSelections(
        JSON.stringify([
          selections[0],
          { ...selections[1], teamId: selections[0].teamId },
          selections[2]
        ]),
        3,
        teamIds
      )
    ).toBeNull();
    expect(
      parseFranchiseSelections(
        JSON.stringify([
          selections[0],
          { ...selections[1], teamId: "unknown" },
          selections[2]
        ]),
        3,
        teamIds
      )
    ).toBeNull();
  });
});
