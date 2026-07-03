import type { DraftDbClient } from "./draft-db";

export type DraftEventType =
  | "franchise_selection_changed"
  | "redraft_pick_changed"
  | "presence_changed"
  | "conflict_resolved";

export type DraftEvent = {
  id: number;
  eventType: DraftEventType;
  payload: unknown;
};

type DraftEventRow = {
  id: number | string;
  event_type: DraftEventType;
  payload: unknown;
};

export async function ensureDraftEventSchema(db: DraftDbClient) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS draft_events (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      event_type text NOT NULL,
      payload jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

export async function insertDraftEvent(
  db: DraftDbClient,
  eventType: DraftEventType,
  payload: unknown
) {
  const rows = await db.query<{ id: number | string }>(
    `
      INSERT INTO draft_events (event_type, payload)
      VALUES ($1, $2::jsonb)
      RETURNING id
    `,
    [eventType, JSON.stringify(payload)]
  );

  return Number(rows[0]?.id ?? 0);
}

export async function loadDraftEventsAfter(db: DraftDbClient, afterId: number) {
  const rows = await db.query<DraftEventRow>(
    `
      SELECT id, event_type, payload
      FROM draft_events
      WHERE id > $1
      ORDER BY id
      LIMIT 100
    `,
    [afterId]
  );

  return rows.map((row) => ({
    id: Number(row.id),
    eventType: row.event_type,
    payload: row.payload
  }));
}

export function formatSseEvent(event: DraftEvent) {
  return [
    `id: ${event.id}`,
    `event: ${event.eventType}`,
    `data: ${JSON.stringify(event.payload)}`,
    "",
    ""
  ].join("\n");
}
