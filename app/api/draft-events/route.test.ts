import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/lib/auth";
import { getDraftDbClient } from "@/lib/draft-db";
import {
  ensureDraftEventSchema,
  formatSseEvent,
  loadDraftEventsAfter
} from "@/lib/draft-events";
import { GET } from "./route";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers())
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn()
    }
  }
}));

vi.mock("@/lib/draft-db", () => ({
  getDraftDbClient: vi.fn()
}));

vi.mock("@/lib/draft-events", () => ({
  ensureDraftEventSchema: vi.fn(),
  formatSseEvent: vi.fn(
    (event) =>
      `id: ${event.id}\nevent: ${event.eventType}\ndata: ${JSON.stringify(
        event.payload
      )}\n\n`
  ),
  loadDraftEventsAfter: vi.fn()
}));

const db = {
  query: vi.fn(async () => [{ id: "user-7", email: "chris@nba2kfl.local" }])
};

describe("draft events SSE API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDraftDbClient).mockReturnValue(db);
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { email: "chris@nba2kfl.local", name: "Chris" }
    });
    vi.mocked(loadDraftEventsAfter).mockResolvedValue([
      {
        id: 12,
        eventType: "redraft_pick_changed",
        payload: { pickNumber: 1, playerName: "Victor Wembanyama" }
      }
    ]);
  });

  it("streams draft events after the Last-Event-ID cursor", async () => {
    const response = await GET(
      new Request("http://localhost/api/draft-events", {
        headers: { "Last-Event-ID": "11" }
      })
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(ensureDraftEventSchema).toHaveBeenCalledWith(db);
    expect(loadDraftEventsAfter).toHaveBeenCalledWith(db, 11);
    expect(formatSseEvent).toHaveBeenCalledWith({
      id: 12,
      eventType: "redraft_pick_changed",
      payload: { pickNumber: 1, playerName: "Victor Wembanyama" }
    });
    expect(body).toContain("event: redraft_pick_changed");
    expect(body).toContain(": keepalive");
  });

  it("uses the after search param before the Last-Event-ID header", async () => {
    await GET(
      new Request("http://localhost/api/draft-events?after=25", {
        headers: { "Last-Event-ID": "11" }
      })
    );

    expect(loadDraftEventsAfter).toHaveBeenCalledWith(db, 25);
  });

  it("rejects unauthenticated stream requests", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/draft-events"));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: "Connexion requise." });
    expect(loadDraftEventsAfter).not.toHaveBeenCalled();
  });
});
