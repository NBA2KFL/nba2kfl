import { describe, expect, it } from "vitest";
import { NBA_TEAMS } from "./teams";

describe("NBA_TEAMS", () => {
  it("contains logo metadata for all 30 teams", () => {
    expect(NBA_TEAMS).toHaveLength(30);

    for (const team of NBA_TEAMS) {
      expect("abbreviation" in team).toBe(true);
      expect("nbaTeamId" in team).toBe(true);
      expect("logoUrl" in team).toBe(true);
    }
  });
});
