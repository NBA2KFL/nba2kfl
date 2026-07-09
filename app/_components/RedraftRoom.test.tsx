import { describe, expect, it } from "vitest";
import { getVisiblePlayerOptions, normalizeRedraftRounds } from "./RedraftRoom";
import type { Nba2kRosterPlayerSummary } from "@/lib/nba2k-roster-db";

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
