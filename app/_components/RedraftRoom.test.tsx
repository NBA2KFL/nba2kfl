import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canCurrentUserEditRedraftPick,
  canCurrentUserSelectRedraftPick,
  clearCurrentUserRedraftPicks,
  getVisiblePlayerOptions,
  notifyRedraftPickValidated,
  requestRedraftPickUpdate,
  requestRedraftPicks,
  requestRedraftRecap
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

  it("allows admins to edit picks for any GM slot", () => {
    expect(canCurrentUserEditRedraftPick(chrisPick, "admin@nba2kfl.local", true)).toBe(
      true
    );
    expect(canCurrentUserEditRedraftPick(akumaPick, null, true)).toBe(true);
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

  it("allows admins to select the current pick for any GM slot", () => {
    expect(
      canCurrentUserSelectRedraftPick(
        chrisPick,
        chrisPick,
        "admin@nba2kfl.local",
        true
      )
    ).toBe(true);
    expect(
      canCurrentUserSelectRedraftPick(
        chrisPick,
        akumaPick,
        "admin@nba2kfl.local",
        true
      )
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

describe("notifyRedraftPickValidated", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts a validated redraft pick to the notification endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    );

    await notifyRedraftPickValidated({
      gmName: "Chris",
      pickNumber: 7,
      playerName: "Victor Wembanyama",
      playerSourceId: 1,
      round: 1,
      roundPick: 7,
      teamId: "sas",
      teamName: "San Antonio Spurs"
    });

    expect(fetch).toHaveBeenCalledWith("/api/redraft-picks/notifications", {
      body: JSON.stringify({
        gmName: "Chris",
        pickNumber: 7,
        playerName: "Victor Wembanyama",
        playerSourceId: 1,
        round: 1,
        roundPick: 7,
        teamId: "sas",
        teamName: "San Antonio Spurs"
      }),
      headers: { "content-type": "application/json" },
      method: "POST"
    });
  });
});

describe("redraft picks API requests", () => {
  it("loads persisted picks from the redraft API", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ picks: { 7: "Victor Wembanyama" } })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestRedraftPicks()).resolves.toEqual({
      7: "Victor Wembanyama"
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/redraft-picks");

    vi.unstubAllGlobals();
  });

  it("requests an admin Discord recap", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ pickCount: 7, messageCount: 1 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestRedraftRecap()).resolves.toEqual({
      pickCount: 7,
      messageCount: 1
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/redraft-picks/notifications/recap",
      { method: "POST" }
    );
  });

  it("surfaces recap API errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ error: "Acces admin requis." }, { status: 403 })
      )
    );

    await expect(requestRedraftRecap()).rejects.toThrow(
      "Acces admin requis."
    );
  });

  it("persists a player selection through the redraft API", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ picks: { 7: "Victor Wembanyama" } })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestRedraftPickUpdate(7, "Victor Wembanyama")
    ).resolves.toEqual({ 7: "Victor Wembanyama" });
    expect(fetchMock).toHaveBeenCalledWith("/api/redraft-picks", {
      body: JSON.stringify({ pickNumber: 7, playerName: "Victor Wembanyama" }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH"
    });

    vi.unstubAllGlobals();
  });
});
