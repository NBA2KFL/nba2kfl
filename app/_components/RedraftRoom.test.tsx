import { describe, expect, it } from "vitest";
import {
  canCurrentUserEditRedraftPick,
  canCurrentUserSelectRedraftPick,
  clearCurrentUserRedraftPicks,
  getVisiblePlayerOptions,
  normalizeRedraftRounds
} from "./RedraftRoom";
import type { Nba2kRosterPlayerSummary } from "@/lib/nba2k-roster-db";
import type { SnakeDraftPick } from "@/lib/redraft";

const players: Nba2kRosterPlayerSummary[] = [
  {
    sourcePlayerId: 1,
    fullName: "Nikola Jokic",
    position: "C",
    rating: 98,
    teamId: "den",
    teamName: "Denver Nuggets"
  },
  {
    sourcePlayerId: 2,
    fullName: "Shai Gilgeous-Alexander",
    position: "PG",
    rating: 97,
    teamId: "okc",
    teamName: "Oklahoma City Thunder"
  },
  {
    sourcePlayerId: 3,
    fullName: "LeBron James",
    position: "SF",
    rating: 94,
    teamId: "lal",
    teamName: "Los Angeles Lakers"
  }
];

const chrisPick: SnakeDraftPick = {
  pickNumber: 7,
  round: 1,
  roundPick: 7,
  selection: {
    slot: 7,
    gmName: "Chris",
    teamId: "sas"
  }
};

const akumaPick: SnakeDraftPick = {
  pickNumber: 8,
  round: 1,
  roundPick: 8,
  selection: {
    slot: 8,
    gmName: "Akuma",
    teamId: "den"
  }
};

describe("getVisiblePlayerOptions", () => {
  it("does not build player options for closed pick menus", () => {
    expect(
      getVisiblePlayerOptions({
        isOpen: false,
        players,
        selectedPlayer: "",
        selectedPlayers: new Set()
      })
    ).toEqual([]);
  });

  it("filters already selected players when a pick menu is open", () => {
    expect(
      getVisiblePlayerOptions({
        isOpen: true,
        players,
        selectedPlayer: "Nikola Jokic",
        selectedPlayers: new Set(["Nikola Jokic", "LeBron James"])
      })
    ).toEqual([
      {
        label: "Nikola Jokic · C · OVR 98 · Denver Nuggets",
        value: "Nikola Jokic"
      },
      {
        label: "Shai Gilgeous-Alexander · PG · OVR 97 · Oklahoma City Thunder",
        value: "Shai Gilgeous-Alexander"
      }
    ]);
  });
});

describe("normalizeRedraftRounds", () => {
  it("allows the full 14-round redraft and caps larger values", () => {
    expect(normalizeRedraftRounds(14)).toBe(14);
    expect(normalizeRedraftRounds(15)).toBe(14);
  });
});

describe("canCurrentUserEditRedraftPick", () => {
  it("only allows the user linked to the pick slot to select it", () => {
    expect(canCurrentUserEditRedraftPick(chrisPick, "Chris@nba2kfl.local")).toBe(
      true
    );
    expect(canCurrentUserEditRedraftPick(akumaPick, "chris@nba2kfl.local")).toBe(
      false
    );
    expect(canCurrentUserEditRedraftPick(chrisPick, null)).toBe(false);
  });
});

describe("canCurrentUserSelectRedraftPick", () => {
  it("only allows selecting the signed-in user's current pick", () => {
    expect(
      canCurrentUserSelectRedraftPick(chrisPick, chrisPick, "chris@nba2kfl.local")
    ).toBe(true);
    expect(
      canCurrentUserSelectRedraftPick(chrisPick, akumaPick, "chris@nba2kfl.local")
    ).toBe(false);
    expect(
      canCurrentUserSelectRedraftPick(chrisPick, chrisPick, "akuma@nba2kfl.local")
    ).toBe(false);
  });
});

describe("clearCurrentUserRedraftPicks", () => {
  it("only clears picks owned by the signed-in user", () => {
    expect(
      clearCurrentUserRedraftPicks(
        {
          7: "Victor Wembanyama",
          8: "Nikola Jokic"
        },
        [chrisPick, akumaPick],
        "chris@nba2kfl.local"
      )
    ).toEqual({
      8: "Nikola Jokic"
    });
  });
});
