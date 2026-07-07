import type { DraftDbClient } from "./draft-db";
import {
  createDraftSlots,
  FINAL_FRANCHISE_SELECTIONS,
  GM_DRAFT_SLOT_LINKS,
  type FranchiseSelection
} from "./redraft";

type SeedResultRow = {
  seeded_slots: number | string;
  missing_users: number | string;
};

type GmDraftSlotSeedRow = {
  slot: number;
  gmName: string;
  userName: string;
  userEmail: string;
  teamId: string | null;
};

type FranchiseSelectionRow = {
  slot: number;
  gm_name: string;
  team_id: string | null;
};

type UpdatedSlotRow = {
  slot: number;
  user_id: string;
  gm_name: string;
  previous_team_id: string | null;
};

type FranchiseOwnershipRow = {
  team_id: string;
  owner_user_id: string | null;
  owner_email: string | null;
  owner_name: string | null;
  label: string | null;
  is_primary: boolean | null;
  draft_slot: number | null;
  draft_gm_name: string | null;
};

type FranchiseOwnerOptionRow = {
  user_id: string;
  email: string;
  display_name: string;
};

export type FranchiseOwner = {
  userId: string;
  email: string;
  displayName: string;
};

export type FranchiseOwnership = {
  teamId: string;
  owner: FranchiseOwner | null;
  label: string | null;
  isPrimary: boolean;
  draftSlot: number | null;
  draftGmName: string | null;
};

export type FranchiseOwnershipState = {
  franchises: FranchiseOwnership[];
  ownerOptions: FranchiseOwner[];
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

  await db.query(`
    CREATE TABLE IF NOT EXISTS gm_franchises (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES neon_auth."user"(id),
      team_id text NOT NULL,
      label text,
      is_primary boolean NOT NULL DEFAULT false,
      source_slot integer REFERENCES gm_draft_slots(slot),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS gm_franchises_team_id_key
    ON gm_franchises (team_id)
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS gm_franchises_one_primary_per_user_key
    ON gm_franchises (user_id)
    WHERE is_primary
  `);

  await syncFranchisesFromDraftSlots(db);
}

export async function seedGmDraftSlots(db: DraftDbClient) {
  const seedRows = createGmDraftSlotSeedRows();
  const rows = await db.query<SeedResultRow>(
    `
      WITH input AS (
        SELECT *
        FROM jsonb_to_recordset($1::jsonb) AS x(
          slot integer,
          "gmName" text,
          "userName" text,
          "userEmail" text,
          "teamId" text
        )
      ),
      linked_users AS (
        SELECT
          input.slot,
          input."gmName",
          input."userEmail",
          input."teamId",
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
          team_id,
          created_at,
          updated_at
        )
        SELECT
          slot,
          "gmName",
          user_id,
          "teamId",
          now(),
          now()
        FROM linked_users
        ON CONFLICT (slot) DO UPDATE SET
          gm_name = excluded.gm_name,
          user_id = excluded.user_id,
          team_id = COALESCE(
            gm_draft_slots.team_id,
            CASE
              WHEN excluded.team_id IS NULL OR NOT EXISTS (
                SELECT 1
                FROM gm_draft_slots taken
                WHERE taken.team_id = excluded.team_id
                  AND taken.slot <> gm_draft_slots.slot
              )
                THEN excluded.team_id
              ELSE NULL
            END
          ),
          updated_at = now()
        RETURNING slot
      )
      SELECT
        (SELECT count(*)::int FROM upserted) AS seeded_slots,
        (SELECT count(*)::int FROM missing_users) AS missing_users
    `,
    [JSON.stringify(seedRows)]
  );
  const result = rows[0];
  const seededSlots = Number(result?.seeded_slots ?? 0);
  const missingUsers = Number(result?.missing_users ?? GM_DRAFT_SLOT_LINKS.length);

  if (seededSlots + missingUsers !== GM_DRAFT_SLOT_LINKS.length) {
    throw new Error(
      `Unable to seed all GM draft slots: seeded ${seededSlots}, missing users ${missingUsers}.`
    );
  }

  await syncFranchisesFromDraftSlots(db);
}

async function syncFranchisesFromDraftSlots(db: DraftDbClient) {
  await db.query(`
    WITH primary_draft_slots AS (
      SELECT user_id, team_id
      FROM gm_draft_slots
      WHERE team_id IS NOT NULL
        AND lower(gm_name) NOT LIKE '%2e équipe%'
        AND lower(gm_name) NOT LIKE '% 2'
    ),
    released_existing_primary AS (
      SELECT gm_franchises.id
      FROM gm_franchises
      INNER JOIN primary_draft_slots
        ON primary_draft_slots.user_id = gm_franchises.user_id
      WHERE gm_franchises.is_primary
        AND gm_franchises.team_id <> primary_draft_slots.team_id
    )
    UPDATE gm_franchises
    SET is_primary = false, updated_at = now()
    FROM released_existing_primary
    WHERE gm_franchises.id = released_existing_primary.id
  `);

  await db.query(`
    INSERT INTO gm_franchises (
      user_id,
      team_id,
      label,
      is_primary,
      source_slot,
      created_at,
      updated_at
    )
    SELECT
      user_id,
      team_id,
      CASE
        WHEN lower(gm_name) LIKE '%2e équipe%' OR lower(gm_name) LIKE '% 2'
          THEN '2e équipe'
        ELSE 'Équipe principale'
      END AS label,
      lower(gm_name) NOT LIKE '%2e équipe%'
        AND lower(gm_name) NOT LIKE '% 2' AS is_primary,
      slot AS source_slot,
      now(),
      now()
    FROM gm_draft_slots
    WHERE team_id IS NOT NULL
    ON CONFLICT (team_id) DO NOTHING
  `);
}

function createGmDraftSlotSeedRows(): GmDraftSlotSeedRow[] {
  const finalTeamIdsBySlot = new Map<number, string>(
    FINAL_FRANCHISE_SELECTIONS.map((selection) => [
      selection.slot,
      selection.teamId
    ])
  );

  return GM_DRAFT_SLOT_LINKS.map((slot) => ({
    ...slot,
    teamId: finalTeamIdsBySlot.get(slot.slot) ?? null
  }));
}

export async function loadFranchiseSelections(
  db: DraftDbClient,
  validTeamIds: readonly string[]
): Promise<FranchiseSelection[]> {
  await db.query<FranchiseSelectionRow>(`
    SELECT slot, gm_name, team_id
    FROM gm_draft_slots
    ORDER BY slot
  `);

  return createConfiguredFranchiseSelections(validTeamIds);
}

function createConfiguredFranchiseSelections(
  validTeamIds: readonly string[]
): FranchiseSelection[] {
  const validTeamIdSet = new Set(validTeamIds);
  const finalTeamIdsBySlot = new Map<number, string>(
    FINAL_FRANCHISE_SELECTIONS.map((selection) => [
      selection.slot,
      selection.teamId
    ])
  );

  return createDraftSlots(GM_DRAFT_SLOT_LINKS.length).map((selection) => {
    const teamId = finalTeamIdsBySlot.get(selection.slot) ?? null;

    return {
      ...selection,
      teamId: teamId && validTeamIdSet.has(teamId) ? teamId : null
    };
  });
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
      WITH previous AS (
        SELECT
          slot,
          user_id,
          gm_name,
          team_id AS previous_team_id
        FROM gm_draft_slots
        WHERE slot = $1
      ),
      updated AS (
      UPDATE gm_draft_slots
      SET
        team_id = $2,
        updated_at = now()
      WHERE slot = $1
        RETURNING slot, user_id, gm_name
      )
      SELECT
        updated.slot,
        updated.user_id::text AS user_id,
        updated.gm_name,
        previous.previous_team_id
      FROM updated
      INNER JOIN previous ON previous.slot = updated.slot
    `,
    [slot, teamId]
  );
  const row = rows[0];

  if (!row) {
    throw new Error(`GM draft slot ${slot} was not found.`);
  }

  if (row.previous_team_id && row.previous_team_id !== teamId) {
    await clearFranchiseOwner(db, row.previous_team_id);
  }

  if (teamId) {
    await upsertFranchiseOwner(
      db,
      row.user_id,
      teamId,
      getSelectionOwnershipLabel(row.gm_name),
      !isSecondTeamSlot(row.gm_name),
      row.slot
    );
  }
}

export async function clearFranchiseSelections(db: DraftDbClient) {
  await db.query(`
    UPDATE gm_draft_slots SET team_id = NULL, updated_at = now()
  `);

  await db.query(`
    DELETE FROM gm_franchises WHERE source_slot IS NOT NULL
  `);
}

export async function loadFranchiseOwnership(
  db: DraftDbClient,
  validTeamIds: readonly string[]
): Promise<FranchiseOwnershipState> {
  const rows = await db.query<FranchiseOwnershipRow>(
    `
      WITH teams AS (
        SELECT unnest($1::text[]) AS team_id
      )
      SELECT
        teams.team_id,
        gm_franchises.user_id::text AS owner_user_id,
        owner_user.email AS owner_email,
        owner_user.name AS owner_name,
        gm_franchises.label,
        gm_franchises.is_primary,
        gm_draft_slots.slot AS draft_slot,
        gm_draft_slots.gm_name AS draft_gm_name
      FROM teams
      LEFT JOIN gm_franchises ON gm_franchises.team_id = teams.team_id
      LEFT JOIN neon_auth."user" AS owner_user
        ON owner_user.id = gm_franchises.user_id
      LEFT JOIN gm_draft_slots ON gm_draft_slots.team_id = teams.team_id
      ORDER BY teams.team_id
    `,
    [validTeamIds]
  );
  const ownerRows = await db.query<FranchiseOwnerOptionRow>(`
    SELECT DISTINCT
      gm_draft_slots.user_id::text AS user_id,
      neon_auth."user".email,
      COALESCE(neon_auth."user".name, gm_draft_slots.gm_name) AS display_name
    FROM gm_draft_slots
    INNER JOIN neon_auth."user" ON neon_auth."user".id = gm_draft_slots.user_id
    ORDER BY display_name, email
  `);

  return {
    franchises: rows.map((row) => ({
      teamId: row.team_id,
      owner: row.owner_user_id
        ? {
            userId: row.owner_user_id,
            email: row.owner_email ?? "",
            displayName: row.owner_name || row.owner_email || row.owner_user_id
          }
        : null,
      label: row.label,
      isPrimary: Boolean(row.is_primary),
      draftSlot: row.draft_slot,
      draftGmName: row.draft_gm_name
    })),
    ownerOptions: ownerRows.map((row) => ({
      userId: row.user_id,
      email: row.email,
      displayName: row.display_name
    }))
  };
}

export async function setFranchiseOwner(
  db: DraftDbClient,
  teamId: string,
  userId: string,
  label: string | null,
  isPrimary: boolean
) {
  await upsertFranchiseOwner(db, userId, teamId, label, isPrimary, null);
}

export async function clearFranchiseOwner(db: DraftDbClient, teamId: string) {
  await db.query(
    `
      DELETE FROM gm_franchises
      WHERE team_id = $1
    `,
    [teamId]
  );
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

async function upsertFranchiseOwner(
  db: DraftDbClient,
  userId: string,
  teamId: string,
  label: string | null,
  isPrimary: boolean,
  sourceSlot: number | null
) {
  if (isPrimary) {
    await db.query(
      `
        UPDATE gm_franchises SET is_primary = false, updated_at = now()
        WHERE user_id = $1 AND team_id <> $2
      `,
      [userId, teamId]
    );
  }

  const params =
    sourceSlot === null
      ? [userId, teamId, label, isPrimary]
      : [userId, teamId, label, isPrimary, sourceSlot];
  const sourceColumn = sourceSlot === null ? "NULL" : "$5";

  await db.query(
    `
      INSERT INTO gm_franchises (
        user_id,
        team_id,
        label,
        is_primary,
        source_slot,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, ${sourceColumn}, now(), now())
      ON CONFLICT (team_id) DO UPDATE SET
        user_id = excluded.user_id,
        label = excluded.label,
        is_primary = excluded.is_primary,
        source_slot = excluded.source_slot,
        updated_at = now()
    `,
    params
  );
}

function getSelectionOwnershipLabel(gmName: string) {
  return isSecondTeamSlot(gmName) ? "2e équipe" : "Équipe principale";
}

function isSecondTeamSlot(gmName: string) {
  const normalizedName = gmName.toLowerCase();

  return normalizedName.includes("2e équipe") || normalizedName.endsWith(" 2");
}
