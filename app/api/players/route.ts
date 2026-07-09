import { NextResponse } from "next/server";
import { getDraftDbClient, type DraftDbClient } from "@/lib/draft-db";
import {
  ensureNba2kRosterSchema,
  loadNba2kRosterPlayers
} from "@/lib/nba2k-roster-db";

export const dynamic = "force-dynamic";

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

  return db;
}

async function playersResponse(db: DraftDbClient) {
  return NextResponse.json({
    players: await loadNba2kRosterPlayers(db)
  });
}

function databaseErrorResponse(error: unknown) {
  console.error("Players database error", error);

  return NextResponse.json(
    { error: "La base de donnees joueurs est indisponible." },
    { status: 500 }
  );
}
