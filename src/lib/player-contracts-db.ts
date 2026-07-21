import type { DraftDbClient } from "./draft-db";

const SOURCE = "spotrac";

export type PlayerContractSeason = {
  season: number;
  age: number | null;
  status: string | null;
  capHit: number | null;
};

export type ScrapedPlayerContract = {
  spotracId: string;
  teamId: string;
  name: string;
  position: string | null;
  seasons: PlayerContractSeason[];
};

export type PlayerContractSummary = {
  sourcePlayerId: string;
  teamId: string;
  fullName: string;
  position: string | null;
  seasons: PlayerContractSeason[];
};

type PlayerContractRow = {
  source_player_id: string;
  team_id: string;
  full_name: string;
  position: string | null;
  seasons: PlayerContractSeason[];
};

type ImportResultRow = {
  imported_players: number | string;
};

export function parsePlayerContractsPayload(
  payload: unknown
): ScrapedPlayerContract[] {
  if (!Array.isArray(payload)) {
    throw new Error("Player contracts source returned an invalid payload.");
  }

  return payload as ScrapedPlayerContract[];
}

export async function ensurePlayerContractSchema(db: DraftDbClient) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS player_contracts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      source text NOT NULL,
      source_player_id text NOT NULL,
      team_id text NOT NULL,
      full_name text NOT NULL,
      position text,
      seasons jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS player_contracts_source_key
    ON player_contracts (source, source_player_id)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS player_contracts_team_idx
    ON player_contracts (team_id, full_name)
  `);
}

export async function loadPlayerContracts(
  db: DraftDbClient
): Promise<PlayerContractSummary[]> {
  const rows = await db.query<PlayerContractRow>(`
    SELECT source_player_id, team_id, full_name, position, seasons
    FROM player_contracts
    WHERE source = '${SOURCE}'
    ORDER BY full_name ASC
  `);

  return rows.map((row) => ({
    sourcePlayerId: row.source_player_id,
    teamId: row.team_id,
    fullName: row.full_name,
    position: row.position,
    seasons: row.seasons
  }));
}

export function findSeasonCapHit(
  seasons: readonly PlayerContractSeason[],
  season: number
) {
  return seasons.find((entry) => entry.season === season)?.capHit ?? null;
}

const GENERATIONAL_SUFFIX_PATTERN = /\b(jr|sr|ii|iii|iv)\b/g;

const CONTRACT_NAME_ALIASES = new Map<string, string>([
  ["alexandre sarr", "alex sarr"],
  ["carlton carrington", "bub carrington"],
  ["cam christie", "cameron christie"],
  ["herbert jones", "herb jones"]
]);

export function normalizeNameForContractMatch(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(GENERATIONAL_SUFFIX_PATTERN, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  return CONTRACT_NAME_ALIASES.get(normalized) ?? normalized;
}

export function normalizePlayerContract(
  sourcePlayer: ScrapedPlayerContract
): PlayerContractSummary {
  const sourcePlayerId = requiredString(sourcePlayer.spotracId, "spotracId");
  const teamId = requiredString(sourcePlayer.teamId, "teamId");
  const fullName = requiredString(sourcePlayer.name, "name");

  if (!Array.isArray(sourcePlayer.seasons)) {
    throw new Error(`Player contract "${fullName}" is missing seasons.`);
  }

  return {
    sourcePlayerId,
    teamId,
    fullName,
    position: sourcePlayer.position ?? null,
    seasons: sourcePlayer.seasons.map(normalizeSeason)
  };
}

export async function upsertPlayerContracts(
  db: DraftDbClient,
  sourcePlayers: ScrapedPlayerContract[]
) {
  if (sourcePlayers.length === 0) {
    return { importedPlayers: 0 };
  }

  const players = dedupeBySourcePlayerId(
    sourcePlayers.map(normalizePlayerContract)
  ).map((player) => ({ source: SOURCE, ...player }));

  const rows = await db.query<ImportResultRow>(
    `
      WITH input AS (
        SELECT *
        FROM jsonb_to_recordset($1::jsonb) AS x(
          source text,
          "sourcePlayerId" text,
          "teamId" text,
          "fullName" text,
          position text,
          seasons jsonb
        )
      ),
      upserted AS (
        INSERT INTO player_contracts (
          source,
          source_player_id,
          team_id,
          full_name,
          position,
          seasons,
          created_at,
          updated_at
        )
        SELECT
          source,
          "sourcePlayerId",
          "teamId",
          "fullName",
          position,
          seasons,
          now(),
          now()
        FROM input
        ON CONFLICT (source, source_player_id) DO UPDATE SET
          team_id = excluded.team_id,
          full_name = excluded.full_name,
          position = excluded.position,
          seasons = excluded.seasons,
          updated_at = now()
        RETURNING source_player_id
      )
      SELECT count(*)::int AS imported_players
      FROM upserted
    `,
    [JSON.stringify(players)]
  );

  return {
    importedPlayers: Number(rows[0]?.imported_players ?? 0)
  };
}

function dedupeBySourcePlayerId(players: PlayerContractSummary[]) {
  const bySourcePlayerId = new Map<string, PlayerContractSummary>();

  for (const player of players) {
    bySourcePlayerId.set(player.sourcePlayerId, player);
  }

  return [...bySourcePlayerId.values()];
}

function normalizeSeason(season: PlayerContractSeason): PlayerContractSeason {
  return {
    season: requiredInteger(season.season, "season"),
    age: optionalInteger(season.age),
    status: optionalString(season.status),
    capHit: optionalInteger(season.capHit)
  };
}

function requiredString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Player contract field "${fieldName}" is required.`);
  }

  return value.trim();
}

function optionalString(value: unknown) {
  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }

  return null;
}

function requiredInteger(value: unknown, fieldName: string) {
  const integer = optionalInteger(value);

  if (integer === null) {
    throw new Error(`Player contract field "${fieldName}" must be an integer.`);
  }

  return integer;
}

function optionalInteger(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && /^-?\d+$/.test(value)) {
    return Number(value);
  }

  return null;
}
