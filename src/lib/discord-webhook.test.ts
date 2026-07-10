import { describe, expect, it, vi } from "vitest";
import {
  createRedraftPickDiscordPayload,
  createRedraftRecapDiscordPayloads,
  formatRedraftPickDiscordContent,
  sendRedraftPickDiscordNotification
} from "./discord-webhook";

const notification = {
  gmName: "Chris",
  pickNumber: 7,
  playerName: "Victor Wembanyama",
  round: 1,
  roundPick: 7,
  teamName: "San Antonio Spurs",
  teamLogoUrl:
    "https://cdn.nba.com/logos/nba/1610612759/primary/L/logo.svg",
  playerPortraitUrl:
    "https://cdn.nba.com/headshots/nba/latest/1040x760/1641705.png"
};

describe("redraft Discord webhook", () => {
  it("formats a redraft pick validation message", () => {
    expect(formatRedraftPickDiscordContent(notification)).toBe(
      "Pick redraft valide #7 (T1.7)\nChris (San Antonio Spurs) selectionne Victor Wembanyama."
    );
  });

  it("builds a styled embed for a validated pick", () => {
    expect(
      createRedraftPickDiscordPayload(
        notification,
        "2026-07-10T10:00:00.000Z"
      )
    ).toEqual({
      allowed_mentions: { parse: [] },
      embeds: [
        {
          author: {
            name: "San Antonio Spurs",
            icon_url:
              "https://cdn.nba.com/logos/nba/1610612759/primary/L/logo.svg"
          },
          color: 0xf5b335,
          description:
            "**Chris** sélectionne\n➡️ **Victor Wembanyama**",
          footer: { text: "NBA2KFL · Pick #7" },
          thumbnail: {
            url: "https://cdn.nba.com/headshots/nba/latest/1040x760/1641705.png"
          },
          timestamp: "2026-07-10T10:00:00.000Z",
          title: "🏀 PICK VALIDÉ · T1.7"
        }
      ]
    });
  });

  it("renders compact recap cards in batches of at most ten embeds", () => {
    const items = Array.from({ length: 17 }, (_, index) => ({
      pickNumber: index + 1,
      round: Math.floor(index / 30) + 1,
      roundPick: (index % 30) + 1,
      gmName: `GM ${index + 1}`,
      teamName: `Franchise ${index + 1}`,
      playerName: `Joueur ${index + 1}`,
      teamLogoUrl: `https://cdn.example/team-${index + 1}.svg`,
      playerPortraitUrl: `https://cdn.example/player-${index + 1}.png`
    }));

    const payloads = createRedraftRecapDiscordPayloads(
      items,
      "2026-07-10T10:00:00.000Z"
    );

    expect(payloads).toHaveLength(2);
    expect(payloads.map((payload) => payload.embeds.length)).toEqual([10, 7]);
    expect(payloads[0].allowed_mentions).toEqual({ parse: [] });
    expect(payloads[0].embeds[0]).toEqual(
      expect.objectContaining({
        title: "🏀 PICK VALIDÉ · T1.1",
        author: {
          name: "Franchise 1",
          icon_url: "https://cdn.example/team-1.svg"
        },
        thumbnail: { url: "https://cdn.example/player-1.png" }
      })
    );
    expect(payloads[1].embeds[6].title).toBe("🏀 PICK VALIDÉ · T1.17");
  });

  it("omits unavailable image fields", () => {
    const payload = createRedraftPickDiscordPayload({
      ...notification,
      teamLogoUrl: null,
      playerPortraitUrl: null
    });

    expect(payload.embeds[0]).not.toHaveProperty("thumbnail");
    expect(payload.embeds[0].author).toEqual({ name: "San Antonio Spurs" });
  });

  it("posts the notification to Discord without allowed mentions", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    await sendRedraftPickDiscordNotification(
      "https://discord.example/webhook",
      notification,
      fetcher
    );

    expect(fetcher).toHaveBeenCalledWith(
      "https://discord.example/webhook",
      expect.objectContaining({
        headers: { "content-type": "application/json" },
        method: "POST"
      })
    );
    const requestBody = JSON.parse(
      String(fetcher.mock.calls[0][1].body)
    ) as Record<string, unknown>;

    expect(requestBody).toEqual({
      allowed_mentions: { parse: [] },
      embeds: [expect.objectContaining({ title: "🏀 PICK VALIDÉ · T1.7" })]
    });
  });

  it("throws when Discord rejects the webhook", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 500 }));

    await expect(
      sendRedraftPickDiscordNotification(
        "https://discord.example/webhook",
        notification,
        fetcher
      )
    ).rejects.toThrow("Discord webhook notification failed.");
  });
});
