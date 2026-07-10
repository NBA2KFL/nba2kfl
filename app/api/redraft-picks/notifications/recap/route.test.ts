import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import { getDraftDbClient } from "@/lib/draft-db";
import { loadRedraftPickRecap } from "@/lib/redraft-picks";
import { sendDiscordWebhookPayloads } from "@/lib/discord-webhook";
import { POST } from "./route";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers())
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } }
}));

vi.mock("@/lib/draft-db", () => ({
  getDraftDbClient: vi.fn()
}));

vi.mock("@/lib/redraft-picks", () => ({
  loadRedraftPickRecap: vi.fn()
}));

vi.mock("@/lib/discord-webhook", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/discord-webhook")>();

  return {
    ...original,
    sendDiscordWebhookPayloads: vi.fn()
  };
});

const originalAdminEmails = process.env.ADMIN_EMAILS;
const originalWebhookUrl = process.env.DISCORD_DRAFT_WEBHOOK_URL;
const originalApplicationUrl = process.env.BETTER_AUTH_URL;
const db = { query: vi.fn() };
const recapRows = [
  {
    pickNumber: 7,
    round: 1,
    roundPick: 7,
    slot: 7,
    franchiseTeamId: "sas",
    playerName: "Victor Wembanyama",
    nbaPlayerId: 1641705,
    validatedAt: "2026-07-10T10:00:00.000Z"
  }
];

describe("redraft Discord recap API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_EMAILS = "admin@nba2kfl.local";
    process.env.DISCORD_DRAFT_WEBHOOK_URL = "https://discord.example/webhook";
    process.env.BETTER_AUTH_URL = "https://draft.nba2kfl.fr";
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { email: "admin@nba2kfl.local" }
    });
    vi.mocked(getDraftDbClient).mockReturnValue(db);
    vi.mocked(loadRedraftPickRecap).mockResolvedValue(recapRows);
  });

  afterEach(() => {
    process.env.ADMIN_EMAILS = originalAdminEmails;
    process.env.DISCORD_DRAFT_WEBHOOK_URL = originalWebhookUrl;
    process.env.BETTER_AUTH_URL = originalApplicationUrl;
  });

  it("sends all persisted picks for an admin", async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      pickCount: 1,
      messageCount: 1
    });
    expect(sendDiscordWebhookPayloads).toHaveBeenCalledWith(
      "https://discord.example/webhook",
      [
        expect.objectContaining({
          embeds: [
            expect.objectContaining({
              author: expect.objectContaining({
                icon_url:
                  "https://cdn.nba.com/logos/nba/1610612759/primary/L/logo.svg"
              }),
              thumbnail: {
                url: "https://cdn.nba.com/headshots/nba/latest/1040x760/1641705.png"
              }
            })
          ]
        })
      ]
    );
  });

  it("rejects unauthenticated requests before loading picks", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await POST();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Connexion requise."
    });
    expect(loadRedraftPickRecap).not.toHaveBeenCalled();
    expect(sendDiscordWebhookPayloads).not.toHaveBeenCalled();
  });

  it("uses the public fallback portrait for unmatched roster players", async () => {
    vi.mocked(loadRedraftPickRecap).mockResolvedValue([
      { ...recapRows[0], nbaPlayerId: null }
    ]);

    await POST();

    expect(sendDiscordWebhookPayloads).toHaveBeenCalledWith(
      "https://discord.example/webhook",
      [
        expect.objectContaining({
          embeds: [
            expect.objectContaining({
              thumbnail: {
                url: "https://draft.nba2kfl.fr/images/player-silhouette.svg"
              }
            })
          ]
        })
      ]
    );
  });

  it("rejects non-admin requests before loading picks", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { email: "chris@nba2kfl.local" }
    });

    const response = await POST();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Acces admin requis."
    });
    expect(loadRedraftPickRecap).not.toHaveBeenCalled();
    expect(sendDiscordWebhookPayloads).not.toHaveBeenCalled();
  });

  it("rejects an empty recap", async () => {
    vi.mocked(loadRedraftPickRecap).mockResolvedValue([]);

    const response = await POST();

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Aucun pick valide a recapitulé."
    });
    expect(sendDiscordWebhookPayloads).not.toHaveBeenCalled();
  });

  it("fails clearly when the Discord webhook is not configured", async () => {
    delete process.env.DISCORD_DRAFT_WEBHOOK_URL;

    const response = await POST();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Webhook Discord non configure."
    });
    expect(loadRedraftPickRecap).not.toHaveBeenCalled();
    expect(sendDiscordWebhookPayloads).not.toHaveBeenCalled();
  });

  it("returns a Discord error when delivery fails", async () => {
    vi.mocked(sendDiscordWebhookPayloads).mockRejectedValue(
      new Error("Discord rejected the request")
    );

    const response = await POST();

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Notification Discord indisponible."
    });
  });

  it("returns a database error when recap loading fails", async () => {
    vi.mocked(loadRedraftPickRecap).mockRejectedValue(
      new Error("Database unavailable")
    );

    const response = await POST();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "La base de donnees redraft est indisponible."
    });
    expect(sendDiscordWebhookPayloads).not.toHaveBeenCalled();
  });
});
