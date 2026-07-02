import { neon } from "@neondatabase/serverless";
import type { Team } from "@/data/teams";
import { parseDraftSimulation } from "./draft-storage";

const LATEST_SIMULATION_ID = "latest";

export type DraftDbClient = {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    queryText: string,
    params?: unknown[]
  ): Promise<T[]>;
};

type DraftSimulationRow = {
  last_run_at: Date | string;
  payload: unknown;
};

let cachedDbClient: DraftDbClient | null = null;

export function getDraftDbClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to use draft persistence.");
  }

  cachedDbClient ??= neon(process.env.DATABASE_URL) as DraftDbClient;

  return cachedDbClient;
}

export async function ensureDraftSimulationSchema(db: DraftDbClient) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS draft_simulations (
      id text PRIMARY KEY,
      payload jsonb NOT NULL,
      last_run_at timestamptz NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

export async function saveLatestDraftSimulation(
  db: DraftDbClient,
  draftOrder: readonly Team[],
  lastRunAt: Date
) {
  await db.query(
    `
      INSERT INTO draft_simulations (id, payload, last_run_at, updated_at)
      VALUES ($1, $2::jsonb, $3::timestamptz, now())
      ON CONFLICT (id) DO UPDATE SET
        payload = EXCLUDED.payload,
        last_run_at = EXCLUDED.last_run_at,
        updated_at = now()
    `,
    [
      LATEST_SIMULATION_ID,
      JSON.stringify({ teamIds: draftOrder.map((team) => team.id) }),
      lastRunAt.toISOString()
    ]
  );
}

export async function loadLatestDraftSimulation(
  db: DraftDbClient,
  teams: readonly Team[]
) {
  const rows = await db.query<DraftSimulationRow>(
    "SELECT payload, last_run_at FROM draft_simulations WHERE id = $1",
    [LATEST_SIMULATION_ID]
  );
  const row = rows[0];

  if (!row) {
    return null;
  }

  const payload = normalizePayload(row.payload);
  const lastRunAt = new Date(row.last_run_at);

  if (!payload || Number.isNaN(lastRunAt.getTime())) {
    return null;
  }

  return parseDraftSimulation(
    JSON.stringify({
      teamIds: payload.teamIds,
      lastRunAt: lastRunAt.toISOString()
    }),
    teams
  );
}

export async function clearLatestDraftSimulation(db: DraftDbClient) {
  await db.query("DELETE FROM draft_simulations WHERE id = $1", [
    LATEST_SIMULATION_ID
  ]);
}

function normalizePayload(payload: unknown): { teamIds: string[] } | null {
  let value = payload;

  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  if (
    !Array.isArray(candidate.teamIds) ||
    !candidate.teamIds.every((teamId) => typeof teamId === "string")
  ) {
    return null;
  }

  return { teamIds: candidate.teamIds };
}
