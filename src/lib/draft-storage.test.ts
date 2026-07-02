import { describe, expect, it } from "vitest";
import { NBA_TEAMS } from "@/data/teams";
import {
  parseDraftSimulation,
  serializeDraftSimulation
} from "./draft-storage";

describe("draft simulation storage", () => {
  it("round-trips a stored draft order and timestamp", () => {
    const lastRunAt = new Date("2026-07-02T18:30:00.000Z");

    const serialized = serializeDraftSimulation(NBA_TEAMS, lastRunAt);
    const restored = parseDraftSimulation(serialized, NBA_TEAMS);

    expect(restored?.draftOrder.map((team) => team.id)).toEqual(
      NBA_TEAMS.map((team) => team.id)
    );
    expect(restored?.lastRunAt.toISOString()).toBe(lastRunAt.toISOString());
  });

  it("rejects incomplete, duplicate, or unknown team ids", () => {
    const lastRunAt = "2026-07-02T18:30:00.000Z";

    expect(
      parseDraftSimulation(
        JSON.stringify({ teamIds: NBA_TEAMS.slice(1).map((team) => team.id), lastRunAt }),
        NBA_TEAMS
      )
    ).toBeNull();
    expect(
      parseDraftSimulation(
        JSON.stringify({
          teamIds: [
            NBA_TEAMS[0].id,
            NBA_TEAMS[0].id,
            ...NBA_TEAMS.slice(2).map((team) => team.id)
          ],
          lastRunAt
        }),
        NBA_TEAMS
      )
    ).toBeNull();
    expect(
      parseDraftSimulation(
        JSON.stringify({
          teamIds: ["unknown", ...NBA_TEAMS.slice(1).map((team) => team.id)],
          lastRunAt
        }),
        NBA_TEAMS
      )
    ).toBeNull();
  });
});
