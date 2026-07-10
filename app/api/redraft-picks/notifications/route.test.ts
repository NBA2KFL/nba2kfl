import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDraftDbClient } from "@/lib/draft-db";
import {
  ensureNba2kRosterSchema,
  loadRosterPlayerMedia
} from "@/lib/nba2k-roster-db";
import { POST } from "./route";

vi.mock("@/lib/draft-db", () => ({ getDraftDbClient: vi.fn() }));
vi.mock("@/lib/nba2k-roster-db", () => ({
  ensureNba2kRosterSchema: vi.fn(),
  loadRosterPlayerMedia: vi.fn()
}));

const originalWebhookUrl = process.env.DISCORD_DRAFT_WEBHOOK_URL;
const originalApplicationUrl = process.env.BETTER_AUTH_URL;
const db = { query: vi.fn() };

const validPayload = {
  gmName: "Chris",
  pickNumber: 7,
  playerName: "Victor Wembanyama",
  playerSourceId: 400,
  round: 1,
  roundPick: 7,
  teamId: "sas",
  teamName: "San Antonio Spurs"
};

describe("redraft pick notification API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DISCORD_DRAFT_WEBHOOK_URL = "https://discord.example/webhook";
    process.env.BETTER_AUTH_URL = "https://draft.nba2kfl.fr";
    vi.mocked(getDraftDbClient).mockReturnValue(db);
    vi.mocked(loadRosterPlayerMedia).mockResolvedValue({
      nbaPlayerId: 1641705
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    );
  });

  afterEach(() => {
    process.env.DISCORD_DRAFT_WEBHOOK_URL = originalWebhookUrl;
    process.env.BETTER_AUTH_URL = originalApplicationUrl;
    vi.unstubAllGlobals();
  });

  it("sends valid redraft pick notifications to Discord", async () => {
    const response = await POST(
      new Request("http://localhost/api/redraft-picks/notifications", {
        body: JSON.stringify(validPayload),
        method: "POST"
      })
    );

    expect(response.status).toBe(204);
    expect(fetch).toHaveBeenCalledWith(
      "https://discord.example/webhook",
      expect.objectContaining({ method: "POST" })
    );
    expect(ensureNba2kRosterSchema).toHaveBeenCalledWith(db);
    expect(loadRosterPlayerMedia).toHaveBeenCalledWith(db, 400);
    const requestBody = JSON.parse(
      String(vi.mocked(fetch).mock.calls[0][1]?.body)
    );
    expect(requestBody.embeds[0]).toEqual(
      expect.objectContaining({
        author: expect.objectContaining({
          icon_url:
            "https://draft.nba2kfl.fr/api/discord-media/team/1610612759"
        }),
        thumbnail: {
          url: "https://draft.nba2kfl.fr/api/discord-media/player/1641705"
        }
      })
    );
  });

  it("rejects invalid notification payloads", async () => {
    const response = await POST(
      new Request("http://localhost/api/redraft-picks/notifications", {
        body: JSON.stringify({ ...validPayload, playerName: "" }),
        method: "POST"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "Notification redraft invalide." });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects unknown canonical team ids", async () => {
    const response = await POST(
      new Request("http://localhost/api/redraft-picks/notifications", {
        body: JSON.stringify({ ...validPayload, teamId: "fake" }),
        method: "POST"
      })
    );

    expect(response.status).toBe(400);
    expect(loadRosterPlayerMedia).not.toHaveBeenCalled();
  });

  it("uses the public fallback portrait when no NBA id exists", async () => {
    vi.mocked(loadRosterPlayerMedia).mockResolvedValue({ nbaPlayerId: null });

    await POST(
      new Request("http://localhost/api/redraft-picks/notifications", {
        body: JSON.stringify(validPayload),
        method: "POST"
      })
    );
    const requestBody = JSON.parse(
      String(vi.mocked(fetch).mock.calls[0][1]?.body)
    );

    expect(requestBody.embeds[0].thumbnail).toEqual({
      url: "https://draft.nba2kfl.fr/images/player-silhouette.svg"
    });
  });

  it("fails clearly when the Discord webhook is not configured", async () => {
    delete process.env.DISCORD_DRAFT_WEBHOOK_URL;

    const response = await POST(
      new Request("http://localhost/api/redraft-picks/notifications", {
        body: JSON.stringify(validPayload),
        method: "POST"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toEqual({ error: "Webhook Discord non configure." });
    expect(fetch).not.toHaveBeenCalled();
  });
});
