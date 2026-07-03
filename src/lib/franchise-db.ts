import type { DraftDbClient } from "./draft-db";
import {
  createDraftSlots,
  GM_DRAFT_SLOT_LINKS,
  parseFranchiseSelections,
  type FranchiseSelection
} from "./redraft";

type SeedResultRow = {
  seeded_slots: number | string;
  missing_users: number | string;
};

type FranchiseSelectionRow = {
  slot: number;
  gm_name: string;
  team_id: string | null;
};

type UpdatedSlotRow = {
  slot: number;
};

export async function ensureFranchiseSelectionSchema(db: DraftDbClient) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS gm_draft_slots (
      slot integer PRIMARY KEY,
      gm_name text NOT NULL,
      user_id uuid NOT NULL REFERENCES neon_auth."user"(id),
      team_id text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS gm_draft_slots_team_id_key
    ON gm_draft_slots (team_id)
    WHERE team_id IS NOT NULL
  `);
}

export async function seedGmDraftSlots(db: DraftDbClient) {
  const rows = await db.query<SeedResultRow>(
    `
      WITH input AS (
        SELECT *
        FROM jsonb_to_recordset($1::jsonb) AS x(
          slot integer,
          "gmName" text,
          "userName" text,
          "userEmail" text
        )
      ),
      linked_users AS (
        SELECT
          input.slot,
          input."gmName",
          input."userEmail",
          "user".id AS user_id
        FROM input
        INNER JOIN neon_auth."user" ON lower("user".email) = lower(input."userEmail")
      ),
      missing_users AS (
        SELECT input.slot
        FROM input
        LEFT JOIN neon_auth."user" ON lower("user".email) = lower(input."userEmail")
        WHERE "user".id IS NULL
      ),
      upserted AS (
        INSERT INTO gm_draft_slots (
          slot,
          gm_name,
          user_id,
          created_at,
          updated_at
        )
        SELECT
          slot,
          "gmName",
          user_id,
          now(),
          now()
        FROM linked_users
        ON CONFLICT (slot) DO UPDATE SET
          gm_name = excluded.gm_name,
          user_id = excluded.user_id,
          updated_at = now()
        RETURNING slot
      )
      SELECT
        (SELECT count(*)::int FROM upserted) AS seeded_slots,
        (SELECT count(*)::int FROM missing_users) AS missing_users
    `,
    [JSON.stringify(GM_DRAFT_SLOT_LINKS)]
  );
  const result = rows[0];
  const seededSlots = Number(result?.seeded_slots ?? 0);
  const missingUsers = Number(result?.missing_users ?? GM_DRAFT_SLOT_LINKS.length);

  if (seededSlots !== GM_DRAFT_SLOT_LINKS.length || missingUsers > 0) {
    throw new Error(
      `Unable to seed all GM draft slots: seeded ${seededSlots}, missing users ${missingUsers}.`
    );
  }
}

export async function loadFranchiseSelections(
  db: DraftDbClient,
  validTeamIds: readonly string[]
): Promise<FranchiseSelection[]> {
  const rows = await db.query<FranchiseSelectionRow>(`
    SELECT slot, gm_name, team_id
    FROM gm_draft_slots
    ORDER BY slot
  `);
  const storedSelections = rows.map((row) => ({
    slot: row.slot,
    gmName: row.gm_name,
    teamId: row.team_id
  }));

  return (
    parseFranchiseSelections(
      JSON.stringify(storedSelections),
      GM_DRAFT_SLOT_LINKS.length,
      validTeamIds
    ) ?? createDraftSlots(GM_DRAFT_SLOT_LINKS.length)
  );
}

export async function updateFranchiseSelection(
  db: DraftDbClient,
  slot: number,
  teamId: string | null,
  validTeamIds: readonly string[]
) {
  validateSlot(slot);
  validateTeamId(teamId, validTeamIds);

  const rows = await db.query<UpdatedSlotRow>(
    `
      UPDATE gm_draft_slots
      SET
        team_id = $2,
        updated_at = now()
      WHERE slot = $1
      RETURNING slot
    `,
    [slot, teamId]
  );

  if (!rows[0]) {
    throw new Error(`GM draft slot ${slot} was not found.`);
  }
}

export async function clearFranchiseSelections(db: DraftDbClient) {
  await db.query(`
    UPDATE gm_draft_slots SET team_id = NULL, updated_at = now()
  `);
}

function validateSlot(slot: number) {
  if (
    !Number.isInteger(slot) ||
    slot < 1 ||
    slot > GM_DRAFT_SLOT_LINKS.length
  ) {
    throw new Error("Invalid GM draft slot.");
  }
}

function validateTeamId(teamId: string | null, validTeamIds: readonly string[]) {
  if (teamId !== null && !validTeamIds.includes(teamId)) {
    throw new Error("Invalid NBA team id.");
  }
}
