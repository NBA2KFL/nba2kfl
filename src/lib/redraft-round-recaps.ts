import type { DraftDbClient } from "./draft-db";

export async function ensureRedraftRoundRecapSchema(db: DraftDbClient) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS redraft_round_recaps (
      round integer PRIMARY KEY,
      status text NOT NULL CHECK (status IN ('pending', 'sent')),
      created_at timestamptz NOT NULL DEFAULT now(),
      sent_at timestamptz
    )
  `);
}

export async function claimRedraftRoundRecap(db: DraftDbClient, round: number) {
  const rows = await db.query<{ round: number | string }>(
    `INSERT INTO redraft_round_recaps (round, status)
     VALUES ($1, 'pending')
     ON CONFLICT (round) DO UPDATE SET status = redraft_round_recaps.status
     WHERE redraft_round_recaps.status = 'pending'
     RETURNING round`,
    [round]
  );
  return rows.length > 0;
}

export async function markRedraftRoundRecapSent(db: DraftDbClient, round: number) {
  await db.query(
    `UPDATE redraft_round_recaps SET status = 'sent', sent_at = now() WHERE round = $1`,
    [round]
  );
}

export async function loadPendingRedraftRounds(db: DraftDbClient) {
  const rows = await db.query<{ round: number | string }>(
    `SELECT round FROM redraft_round_recaps WHERE status = 'pending' ORDER BY round`
  );
  return rows.map((row) => Number(row.round));
}
