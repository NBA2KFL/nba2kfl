import { describe, expect, it } from "vitest";
import { NBA_TEAMS } from "@/data/teams";
import { shuffleTeams } from "./draft";

describe("shuffleTeams", () => {
  it("returns every team exactly once without mutating the source list", () => {
    const sourceSnapshot = [...NBA_TEAMS];

    const result = shuffleTeams(NBA_TEAMS);

    expect(result).toHaveLength(NBA_TEAMS.length);
    expect(result).not.toBe(NBA_TEAMS);
    expect(result.map((team) => team.id).sort()).toEqual(
      NBA_TEAMS.map((team) => team.id).sort()
    );
    expect(new Set(result.map((team) => team.id)).size).toBe(NBA_TEAMS.length);
    expect(NBA_TEAMS).toEqual(sourceSnapshot);
  });
});
