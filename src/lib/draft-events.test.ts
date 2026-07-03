import { describe, expect, it, vi } from "vitest";
import type { DraftDbClient } from "./draft-db";
import {
  ensureDraftEventSchema,
  formatSseEvent,
  insertDraftEvent,
  loadDraftEventsAfter
} from "./draft-events";

describe("draft events", () => {
  it("creates the draft event table", async () => {
    const db = createDbClient();

    await ensureDraftEventSchema(db);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS draft_events")
    );
  });

  it("inserts a typed event", async () => {
    const db = createDbClient([[{ id: "12" }]]);

    await expect(
      insertDraftEvent(db, "redraft_pick_changed", { pickNumber: 1 })
    ).resolves.toBe(12);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO draft_events"),
      ["redraft_pick_changed", JSON.stringify({ pickNumber: 1 })]
    );
  });

  it("loads events after a cursor", async () => {
    const db = createDbClient([
      [{ id: "13", event_type: "presence_changed", payload: { userId: "u1" } }]
    ]);

    await expect(loadDraftEventsAfter(db, 12)).resolves.toEqual([
      { id: 13, eventType: "presence_changed", payload: { userId: "u1" } }
    ]);
  });

  it("formats one SSE message", () => {
    expect(
      formatSseEvent({
        id: 13,
        eventType: "presence_changed",
        payload: { userId: "u1" }
      })
    ).toBe('id: 13\nevent: presence_changed\ndata: {"userId":"u1"}\n\n');
  });
});

function createDbClient(rowsByCall: Record<string, unknown>[][] = []): DraftDbClient {
  return {
    query: vi.fn().mockImplementation(() => Promise.resolve(rowsByCall.shift() ?? []))
  };
}
