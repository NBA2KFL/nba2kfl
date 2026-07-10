import { describe, expect, it, vi } from "vitest";
import {
  fetchNbaPlayerDirectory,
  indexNbaPlayerIdsByName,
  normalizeNbaPlayerName,
  parseNbaPlayerDirectory
} from "./nba-player-directory";

const payload = {
  resultSets: [
    {
      headers: ["PERSON_ID", "DISPLAY_FIRST_LAST", "ROSTERSTATUS"],
      rowSet: [
        [1641705, "Victor Wembanyama", 1],
        [1629029, "Luka Dončić", 1]
      ]
    }
  ]
};

describe("NBA player directory", () => {
  it("parses NBA person ids and display names", () => {
    expect(parseNbaPlayerDirectory(payload)).toEqual([
      { nbaPlayerId: 1641705, fullName: "Victor Wembanyama" },
      { nbaPlayerId: 1629029, fullName: "Luka Dončić" }
    ]);
  });

  it("matches names without accents, punctuation, or case", () => {
    expect(normalizeNbaPlayerName(" Luka Dončić Jr. ")).toBe(
      "luka doncic jr"
    );
    expect(
      indexNbaPlayerIdsByName(parseNbaPlayerDirectory(payload)).get(
        "luka doncic"
      )
    ).toBe(1629029);
  });

  it("requests current NBA players for the configured season", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json(payload));

    await fetchNbaPlayerDirectory({ season: "2025-26", fetchImpl });

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        search: expect.stringContaining("Season=2025-26")
      }),
      expect.objectContaining({
        headers: expect.objectContaining({ Referer: "https://www.nba.com/" })
      })
    );
  });

  it("rejects invalid directory payloads", () => {
    expect(() => parseNbaPlayerDirectory({ resultSets: [] })).toThrow(
      "NBA player directory returned an invalid payload."
    );
  });

  it("rejects failed directory requests", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 503 }));

    await expect(
      fetchNbaPlayerDirectory({ season: "2025-26", fetchImpl })
    ).rejects.toThrow("NBA player directory request failed: 503.");
  });
});
