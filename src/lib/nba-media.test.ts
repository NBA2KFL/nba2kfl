import { describe, expect, it } from "vitest";
import {
  getNbaPlayerHeadshotUrl,
  getNbaTeamLogoUrl,
  getPlayerPortraitUrl
} from "./nba-media";

describe("NBA media URLs", () => {
  it("builds official NBA team logo URLs", () => {
    expect(getNbaTeamLogoUrl(1610612759)).toBe(
      "https://cdn.nba.com/logos/nba/1610612759/primary/L/logo.svg"
    );
  });

  it("uses the public media proxy when the application has an HTTPS origin", () => {
    expect(
      getNbaTeamLogoUrl(1610612759, "https://draft.nba2kfl.fr")
    ).toBe("https://draft.nba2kfl.fr/api/discord-media/team/1610612759");
    expect(
      getNbaPlayerHeadshotUrl(1641705, "https://draft.nba2kfl.fr")
    ).toBe("https://draft.nba2kfl.fr/api/discord-media/player/1641705");
  });

  it("builds official NBA player headshot URLs", () => {
    expect(getNbaPlayerHeadshotUrl(1641705)).toBe(
      "https://cdn.nba.com/headshots/nba/latest/1040x760/1641705.png"
    );
  });

  it("uses the public NBA2KFL silhouette when no portrait exists", () => {
    expect(getPlayerPortraitUrl(null, "https://draft.nba2kfl.fr")).toBe(
      "https://draft.nba2kfl.fr/images/player-silhouette.svg"
    );
  });

  it("omits fallback portraits for non-public origins", () => {
    expect(getPlayerPortraitUrl(null, "http://localhost:3000")).toBeNull();
    expect(getPlayerPortraitUrl(null, undefined)).toBeNull();
  });

  it("rejects invalid numeric ids", () => {
    expect(() => getNbaTeamLogoUrl(0)).toThrow("NBA media id must be positive.");
    expect(() => getNbaPlayerHeadshotUrl(-1)).toThrow(
      "NBA media id must be positive."
    );
  });
});
