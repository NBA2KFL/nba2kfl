import { NextResponse } from "next/server";
import { NBA_TEAMS } from "@/data/teams";
import { shuffleTeams } from "@/lib/draft";
import {
  clearLatestDraftSimulation,
  ensureDraftSimulationSchema,
  getDraftDbClient,
  loadLatestDraftSimulation,
  saveLatestDraftSimulation
} from "@/lib/draft-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDraftDbClient();

    await ensureDraftSimulationSchema(db);

    return NextResponse.json(
      toApiResponse(await loadLatestDraftSimulation(db, NBA_TEAMS))
    );
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

export async function POST() {
  try {
    const db = getDraftDbClient();
    const draftOrder = shuffleTeams(NBA_TEAMS);
    const lastRunAt = new Date();

    await ensureDraftSimulationSchema(db);
    await saveLatestDraftSimulation(db, draftOrder, lastRunAt);

    return NextResponse.json(toApiResponse({ draftOrder, lastRunAt }));
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

export async function DELETE() {
  try {
    const db = getDraftDbClient();

    await ensureDraftSimulationSchema(db);
    await clearLatestDraftSimulation(db);

    return NextResponse.json(toApiResponse(null));
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

function toApiResponse(
  simulation: { draftOrder: typeof NBA_TEAMS; lastRunAt: Date } | null
) {
  return {
    draftOrder: simulation?.draftOrder ?? [],
    lastRunAt: simulation?.lastRunAt.toISOString() ?? null
  };
}

function databaseErrorResponse(error: unknown) {
  console.error("Draft simulation database error", error);

  return NextResponse.json(
    { error: "La base de données est indisponible." },
    { status: 500 }
  );
}
