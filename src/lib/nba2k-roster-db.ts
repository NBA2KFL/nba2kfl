import { NBA_TEAMS } from "../data/teams.ts";
import type { DraftDbClient } from "./draft-db";

const GAME_VERSION = "nba2k26";
const SOURCE = "nba2klab";
export const NBA2KLAB_ROSTER_URL =
  "https://www.nba2klab.com/.netlify/functions/player-roster";

type Nba2kRosterSourcePlayer = Record<string, unknown>;

type Nba2kRosterAttribute = string | number | boolean | null;

export type Nba2kRosterPlayer = {
  gameVersion: string;
  source: string;
  sourcePlayerId: number;
  teamId: string;
  teamName: string;
  firstName: string;
  lastName: string;
  fullName: string;
  position: string | null;
  rating: number;
  height: string | null;
  weight: number | null;
  wingspan: string | null;
  age: number | null;
  potential: string | null;
  attributes: Record<string, Nba2kRosterAttribute>;
  sourceUrl: string;
};

export function parseNba2kRosterSourcePayload(
  payload: unknown
): Nba2kRosterSourcePlayer[] {
  if (!Array.isArray(payload)) {
    throw new Error("NBA 2K roster source returned an invalid payload.");
  }

  return payload as Nba2kRosterSourcePlayer[];
}

type ImportResultRow = {
  imported_players: number | string;
};

const SOURCE_FIELD_KEYS = new Set([
  "id",
  "first_name",
  "last_name",
  "team",
  "position",
  "rating",
  "overall_rating",
  "height",
  "weight",
  "wingspan",
  "age",
  "pot"
]);

const TEAM_IDS_BY_SOURCE_NAME = new Map(
  [
    ...NBA_TEAMS.map((team) => [normalizeName(team.name), team.id] as const),
    [normalizeName("Los Angeles Clippers"), "lac"] as const
  ]
);

export async function ensureNba2kRosterSchema(db: DraftDbClient) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS nba2k_roster_players (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      game_version text NOT NULL,
      source text NOT NULL,
      source_player_id integer NOT NULL,
      team_id text NOT NULL,
      team_name text NOT NULL,
      first_name text NOT NULL,
      last_name text NOT NULL,
      full_name text NOT NULL,
      position text,
      rating integer NOT NULL,
      height text,
      weight integer,
      wingspan text,
      age integer,
      potential text,
      attributes jsonb NOT NULL,
      source_url text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS nba2k_roster_players_source_key
    ON nba2k_roster_players (game_version, source, source_player_id)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS nba2k_roster_players_team_rating_idx
    ON nba2k_roster_players (team_id, rating DESC, full_name)
  `);
}

export function normalizeNba2kRosterPlayer(
  sourcePlayer: Nba2kRosterSourcePlayer
): Nba2kRosterPlayer {
  const sourcePlayerId = requiredInteger(sourcePlayer.id, "id");
  const firstName = requiredString(sourcePlayer.first_name, "first_name");
  const lastName = requiredString(sourcePlayer.last_name, "last_name");
  const teamName = requiredString(sourcePlayer.team, "team");
  const teamId = TEAM_IDS_BY_SOURCE_NAME.get(normalizeName(teamName));

  if (!teamId) {
    throw new Error(`Unknown NBA 2K roster team: ${teamName}`);
  }

  return {
    gameVersion: GAME_VERSION,
    source: SOURCE,
    sourcePlayerId,
    teamId,
    teamName,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    position: optionalString(sourcePlayer.position),
    rating: requiredInteger(
      sourcePlayer.rating ?? sourcePlayer.overall_rating,
      "rating"
    ),
    height: optionalString(sourcePlayer.height),
    weight: optionalInteger(sourcePlayer.weight),
    wingspan: optionalString(sourcePlayer.wingspan),
    age: optionalInteger(sourcePlayer.age),
    potential: optionalString(sourcePlayer.pot),
    attributes: extractAttributes(sourcePlayer),
    sourceUrl: NBA2KLAB_ROSTER_URL
  };
}

export async function upsertNba2kRosterPlayers(
  db: DraftDbClient,
  sourcePlayers: Nba2kRosterSourcePlayer[]
) {
  if (sourcePlayers.length === 0) {
    return { importedPlayers: 0 };
  }

  const players = sourcePlayers.map(normalizeNba2kRosterPlayer);
  const rows = await db.query<ImportResultRow>(
    `
      WITH input AS (
        SELECT *
        FROM jsonb_to_recordset($1::jsonb) AS x(
          "gameVersion" text,
          source text,
          "sourcePlayerId" integer,
          "teamId" text,
          "teamName" text,
          "firstName" text,
          "lastName" text,
          "fullName" text,
          position text,
          rating integer,
          height text,
          weight integer,
          wingspan text,
          age integer,
          potential text,
          attributes jsonb,
          "sourceUrl" text
        )
      ),
      upserted AS (
        INSERT INTO nba2k_roster_players (
          game_version,
          source,
          source_player_id,
          team_id,
          team_name,
          first_name,
          last_name,
          full_name,
          position,
          rating,
          height,
          weight,
          wingspan,
          age,
          potential,
          attributes,
          source_url,
          created_at,
          updated_at
        )
        SELECT
          "gameVersion",
          source,
          "sourcePlayerId",
          "teamId",
          "teamName",
          "firstName",
          "lastName",
          "fullName",
          position,
          rating,
          height,
          weight,
          wingspan,
          age,
          potential,
          attributes,
          "sourceUrl",
          now(),
          now()
        FROM input
        ON CONFLICT (game_version, source, source_player_id) DO UPDATE SET
          team_id = excluded.team_id,
          team_name = excluded.team_name,
          first_name = excluded.first_name,
          last_name = excluded.last_name,
          full_name = excluded.full_name,
          position = excluded.position,
          rating = excluded.rating,
          height = excluded.height,
          weight = excluded.weight,
          wingspan = excluded.wingspan,
          age = excluded.age,
          potential = excluded.potential,
          attributes = excluded.attributes,
          source_url = excluded.source_url,
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

function extractAttributes(sourcePlayer: Nba2kRosterSourcePlayer) {
  const attributes: Record<string, Nba2kRosterAttribute> = {};

  for (const [key, value] of Object.entries(sourcePlayer)) {
    if (SOURCE_FIELD_KEYS.has(key) || !isAttributeValue(value)) {
      continue;
    }

    attributes[key] = value;
  }

  return attributes;
}

function isAttributeValue(value: unknown): value is Nba2kRosterAttribute {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function requiredString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`NBA 2K roster field "${fieldName}" is required.`);
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
    throw new Error(`NBA 2K roster field "${fieldName}" must be an integer.`);
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

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
