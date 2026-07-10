import type { DraftDbClient } from "./draft-db";
import type { Nba2kRosterPlayerSummary } from "./nba2k-roster-db";
import type { RedraftPicksByNumber, SnakeDraftPick } from "./redraft";

type RedraftPickRow = {
  pick_number: number | string;
  player_name: string;
};
type RedraftPickRecapDbRow = {
  pick_number: number | string;
  round: number | string;
  round_pick: number | string;
  slot: number | string;
  franchise_team_id: string;
  player_name: string;
  nba_player_id: number | string | null;
  updated_at: Date | string;
};
type RedraftRoundRecapDbRow = {
  pick_number: number | string;
  slot: number | string;
  player_name: string;
};

export type RedraftPickRecapRow = {
  pickNumber: number;
  round: number;
  roundPick: number;
  slot: number;
  franchiseTeamId: string;
  playerName: string;
  nbaPlayerId: number | null;
  validatedAt: Date | string;
};

export async function loadRedraftRoundRecapItems(db: DraftDbClient, round: number) {
  const rows = await db.query<RedraftRoundRecapDbRow>(
    `SELECT pick_number, slot, player_name FROM redraft_picks
     WHERE round = $1 AND player_name IS NOT NULL ORDER BY pick_number`,
    [round]
  );
  return rows.map((row) => ({
    pickNumber: Number(row.pick_number),
    slot: Number(row.slot),
    playerName: row.player_name
  }));
}

export async function ensureRedraftPickSchema(db: DraftDbClient) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS redraft_picks (
      pick_number integer PRIMARY KEY,
      round integer NOT NULL,
      round_pick integer NOT NULL,
      slot integer NOT NULL REFERENCES gm_draft_slots(slot),
      franchise_team_id text NOT NULL,
      roster_source_player_id integer NOT NULL,
      player_name text NOT NULL,
      selected_by_user_id uuid NOT NULL REFERENCES neon_auth."user"(id),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS redraft_picks_player_key
    ON redraft_picks (roster_source_player_id)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS redraft_picks_franchise_team_idx
    ON redraft_picks (franchise_team_id, pick_number)
  `);
}

export async function loadRedraftPicks(
  db: DraftDbClient
): Promise<RedraftPicksByNumber> {
  const rows = await db.query<RedraftPickRow>(`
    SELECT pick_number, player_name
    FROM redraft_picks
    ORDER BY pick_number
  `);

  return Object.fromEntries(
    rows.map((row) => [String(row.pick_number), row.player_name])
  );
}

export async function loadRedraftPickRecap(
  db: DraftDbClient
): Promise<RedraftPickRecapRow[]> {
  const rows = await db.query<RedraftPickRecapDbRow>(`
    SELECT
      redraft.pick_number,
      redraft.round,
      redraft.round_pick,
      redraft.slot,
      redraft.franchise_team_id,
      redraft.player_name,
      roster.nba_player_id,
      redraft.updated_at
    FROM redraft_picks AS redraft
    LEFT JOIN nba2k_roster_players AS roster
      ON roster.source_player_id = redraft.roster_source_player_id
      AND roster.game_version = 'nba2k26'
      AND roster.source = 'nba2klab'
    ORDER BY redraft.pick_number
  `);

  return rows.map((row) => ({
    pickNumber: Number(row.pick_number),
    round: Number(row.round),
    roundPick: Number(row.round_pick),
    slot: Number(row.slot),
    franchiseTeamId: row.franchise_team_id,
    playerName: row.player_name,
    nbaPlayerId:
      row.nba_player_id === null || row.nba_player_id === undefined
        ? null
        : Number(row.nba_player_id),
    validatedAt: row.updated_at
  }));
}

export async function upsertRedraftPick(
  db: DraftDbClient,
  pick: SnakeDraftPick,
  player: Nba2kRosterPlayerSummary,
  selectedByUserId: string
) {
  await db.query(
    `
      INSERT INTO redraft_picks (
        pick_number,
        round,
        round_pick,
        slot,
        franchise_team_id,
        roster_source_player_id,
        player_name,
        selected_by_user_id,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())
      ON CONFLICT (pick_number) DO UPDATE SET
        round = excluded.round,
        round_pick = excluded.round_pick,
        slot = excluded.slot,
        franchise_team_id = excluded.franchise_team_id,
        roster_source_player_id = excluded.roster_source_player_id,
        player_name = excluded.player_name,
        selected_by_user_id = excluded.selected_by_user_id,
        updated_at = now()
    `,
    [
      pick.pickNumber,
      pick.round,
      pick.roundPick,
      pick.selection.slot,
      pick.selection.teamId,
      player.sourcePlayerId,
      player.fullName,
      selectedByUserId
    ]
  );
}

export async function clearRedraftPick(
  db: DraftDbClient,
  pickNumber: number
) {
  await db.query(
    `
      DELETE FROM redraft_picks
      WHERE pick_number = $1
    `,
    [pickNumber]
  );
}

export async function clearRedraftPicksForSlots(
  db: DraftDbClient,
  slots: readonly number[]
) {
  if (slots.length === 0) {
    return;
  }

  await db.query(
    `
      DELETE FROM redraft_picks
      WHERE slot = ANY($1::integer[])
    `,
    [[...slots]]
  );
}
