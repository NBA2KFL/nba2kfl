import { describe, expect, it } from "vitest";
import { filterRosterByStatus } from "./PlayerRosterDialog";
import type { Nba2kRosterPlayerSummary } from "@/lib/nba2k-roster-db";

const players: Nba2kRosterPlayerSummary[] = [
  {
    sourcePlayerId: 1,
    nbaPlayerId: null,
    fullName: "Nikola Jokic",
    position: "C",
    rating: 98,
    teamId: "den",
    teamName: "Denver Nuggets"
  },
  {
    sourcePlayerId: 2,
    nbaPlayerId: null,
    fullName: "Shai Gilgeous-Alexander",
    position: "PG",
    rating: 97,
    teamId: "okc",
    teamName: "Oklahoma City Thunder"
  },
  {
    sourcePlayerId: 3,
    nbaPlayerId: null,
    fullName: "LeBron James",
    position: "SF",
    rating: 94,
    teamId: "lal",
    teamName: "Los Angeles Lakers"
  }
];

describe("filterRosterByStatus", () => {
  it("shows only players not yet selected when filtering on available", () => {
    const result = filterRosterByStatus({
      players,
      position: "all",
      search: "",
      selectedPlayers: new Set(["Nikola Jokic"]),
      status: "available"
    });

    expect(result.map((player) => player.fullName)).toEqual([
      "Shai Gilgeous-Alexander",
      "LeBron James"
    ]);
  });

  it("shows only already selected players when filtering on taken", () => {
    const result = filterRosterByStatus({
      players,
      position: "all",
      search: "",
      selectedPlayers: new Set(["Nikola Jokic"]),
      status: "taken"
    });

    expect(result.map((player) => player.fullName)).toEqual(["Nikola Jokic"]);
  });

  it("combines status with search and position filters", () => {
    const result = filterRosterByStatus({
      players,
      position: "SF",
      search: "lebron",
      selectedPlayers: new Set(),
      status: "available"
    });

    expect(result.map((player) => player.fullName)).toEqual(["LeBron James"]);
  });
});
