import { NextResponse } from "next/server";
import { getDraftDbClient, type DraftDbClient } from "@/lib/draft-db";
import {
  ensureNba2kRosterSchema,
  loadNba2kRosterPlayers
} from "@/lib/nba2k-roster-db";
import {
  ensurePlayerContractSchema,
  findSeasonCapHit,
  loadPlayerContracts,
  normalizeNameForContractMatch
} from "@/lib/player-contracts-db";

export const dynamic = "force-dynamic";

const CONTRACT_DISPLAY_SEASON = 2026;

export async function GET() {
  try {
    const db = await preparePlayersDb();

    return playersResponse(db);
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

async function preparePlayersDb() {
  const db = getDraftDbClient();

  await ensureNba2kRosterSchema(db);
  await ensurePlayerContractSchema(db);

  return db;
}

async function playersResponse(db: DraftDbClient) {
  const [rosterPlayers, contracts] = await Promise.all([
    loadNba2kRosterPlayers(db),
    loadPlayerContracts(db)
  ]);

  const capHitByName = new Map(
    contracts.map((contract) => [
      normalizeNameForContractMatch(contract.fullName),
      findSeasonCapHit(contract.seasons, CONTRACT_DISPLAY_SEASON)
    ])
  );

  return NextResponse.json({
    players: rosterPlayers.map((player) => ({
      ...player,
      contractCapHit2026:
        capHitByName.get(normalizeNameForContractMatch(player.fullName)) ?? null
    }))
  });
}

function databaseErrorResponse(error: unknown) {
  console.error("Players database error", error);

  return NextResponse.json(
    { error: "La base de donnees joueurs est indisponible." },
    { status: 500 }
  );
}
