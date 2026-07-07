import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { Pool } from "pg";
import type { DraftDbClient } from "../src/lib/draft-db.ts";
import {
  ensureNba2kRosterSchema,
  NBA2KLAB_ROSTER_URL,
  normalizeNba2kRosterPlayer,
  parseNba2kRosterSourcePayload,
  upsertNba2kRosterPlayers
} from "../src/lib/nba2k-roster-db.ts";

type SyncOptions = {
  dryRun?: boolean;
  fetchImpl?: typeof fetch;
  sourceUrl?: string;
};

export async function syncNba2k26Rosters({
  dryRun = false,
  fetchImpl = fetch,
  sourceUrl = process.env.NBA2K_ROSTER_SOURCE_URL || NBA2KLAB_ROSTER_URL
}: SyncOptions = {}) {
  const response = await fetchImpl(sourceUrl);

  if (!response.ok) {
    throw new Error(
      `Unable to fetch NBA 2K roster source: ${response.status} ${response.statusText}`
    );
  }

  const sourcePlayers = parseNba2kRosterSourcePayload(await response.json());
  const normalizedPlayers = sourcePlayers.map(normalizeNba2kRosterPlayer);
  const teamCount = new Set(normalizedPlayers.map((player) => player.teamId)).size;

  if (dryRun) {
    return {
      dryRun,
      sourceUrl,
      fetchedPlayers: sourcePlayers.length,
      importedPlayers: 0,
      teamCount
    };
  }

  loadEnvFile(".env.local");
  loadEnvFile(".env");

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const db = createDbClient(pool);
    await ensureNba2kRosterSchema(db);
    const result = await upsertNba2kRosterPlayers(db, sourcePlayers);

    return {
      dryRun,
      sourceUrl,
      fetchedPlayers: sourcePlayers.length,
      importedPlayers: result.importedPlayers,
      teamCount
    };
  } finally {
    await pool.end();
  }
}

function createDbClient(pool: Pool): DraftDbClient {
  return {
    async query(queryText, params) {
      const result = await pool.query(queryText, params);

      return result.rows;
    }
  };
}

function loadEnvFile(path: string) {
  if (!existsSync(path)) {
    return;
  }

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);

    if (!match || process.env[match[1]]) {
      continue;
    }

    process.env[match[1]] = unwrapQuotedValue(match[2].trim());
  }
}

function unwrapQuotedValue(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

async function main() {
  const result = await syncNba2k26Rosters({
    dryRun: process.argv.includes("--dry-run")
  });

  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
