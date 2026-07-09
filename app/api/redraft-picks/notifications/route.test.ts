import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const originalWebhookUrl = process.env.DISCORD_DRAFT_WEBHOOK_URL;

const validPayload = {
  gmName: "Chris",
  pickNumber: 7,
  playerName: "Victor Wembanyama",
  round: 1,
  roundPick: 7,
  teamName: "San Antonio Spurs"
};

describe("redraft pick notification API", () => {
  beforeEach(() => {
    process.env.DISCORD_DRAFT_WEBHOOK_URL = "https://discord.example/webhook";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    );
  });

  afterEach(() => {
    process.env.DISCORD_DRAFT_WEBHOOK_URL = originalWebhookUrl;
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
