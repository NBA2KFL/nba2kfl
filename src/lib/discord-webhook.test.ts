import { describe, expect, it, vi } from "vitest";
import {
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

  it("posts the notification to Discord without allowed mentions", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    await sendRedraftPickDiscordNotification(
      "https://discord.example/webhook",
      notification,
      fetcher
    );

    expect(fetcher).toHaveBeenCalledWith("https://discord.example/webhook", {
      body: JSON.stringify({
        allowed_mentions: { parse: [] },
        content:
          "Pick redraft valide #7 (T1.7)\nChris (San Antonio Spurs) selectionne Victor Wembanyama."
      }),
      headers: { "content-type": "application/json" },
      method: "POST"
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
