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
  teamName: "San Antonio Spurs"
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
          color: 0xf5b335,
          description:
            "**Chris** · San Antonio Spurs\n➡️ **Victor Wembanyama**",
          footer: { text: "NBA2KFL · Pick #7" },
          timestamp: "2026-07-10T10:00:00.000Z",
          title: "🏀 PICK VALIDÉ · T1.7"
        }
      ]
    });
  });

  it("groups recap picks by round in a styled embed", () => {
    const payloads = createRedraftRecapDiscordPayloads(
      [
        {
          pickNumber: 1,
          round: 1,
          roundPick: 1,
          gmName: "Anna",
          teamName: "Houston Rockets",
          playerName: "Nikola Jokic"
        },
        {
          pickNumber: 2,
          round: 1,
          roundPick: 2,
          gmName: "Elias",
          teamName: "Indiana Pacers",
          playerName: "Shai Gilgeous-Alexander"
        },
        {
          pickNumber: 31,
          round: 2,
          roundPick: 1,
          gmName: "Khaladan",
          teamName: "Cleveland Cavaliers",
          playerName: "Victor Wembanyama"
        }
      ],
      "2026-07-10T10:00:00.000Z"
    );

    expect(payloads).toHaveLength(1);
    expect(payloads[0]).toEqual({
      allowed_mentions: { parse: [] },
      embeds: [
        {
          color: 0xf5b335,
          description: [
            "**TOUR 1**",
            "`#1` · **Anna** · Houston Rockets → **Nikola Jokic**",
            "`#2` · **Elias** · Indiana Pacers → **Shai Gilgeous-Alexander**",
            "",
            "**TOUR 2**",
            "`#31` · **Khaladan** · Cleveland Cavaliers → **Victor Wembanyama**"
          ].join("\n"),
          footer: { text: "3 picks validés · NBA2KFL" },
          timestamp: "2026-07-10T10:00:00.000Z",
          title: "🏀 RÉCAP REDRAFT NBA2KFL"
        }
      ]
    });
  });

  it("chunks long recaps below Discord embed limits without losing picks", () => {
    const items = Array.from({ length: 90 }, (_, index) => ({
      pickNumber: index + 1,
      round: Math.floor(index / 30) + 1,
      roundPick: (index % 30) + 1,
      gmName: `GM ${index + 1} ${"A".repeat(20)}`,
      teamName: `Franchise ${index + 1} ${"B".repeat(25)}`,
      playerName: `Joueur ${index + 1} ${"C".repeat(30)}`
    }));

    const payloads = createRedraftRecapDiscordPayloads(items);
    const descriptions = payloads.map((payload) => payload.embeds[0].description);
    const combinedDescription = descriptions.join("\n");

    expect(payloads.length).toBeGreaterThan(1);
    for (const payload of payloads) {
      const embed = payload.embeds[0];
      const embedTextLength =
        embed.title.length +
        embed.description.length +
        embed.footer.text.length;

      expect(embedTextLength).toBeLessThan(6000);
    }
    for (const item of items) {
      expect(combinedDescription.match(new RegExp(`\\#${item.pickNumber}\\b`, "g")))
        .toHaveLength(1);
    }
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
