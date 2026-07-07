import { NextResponse } from "next/server";
import { NBA_TEAMS } from "@/data/teams";
import { getDraftDbClient, type DraftDbClient } from "@/lib/draft-db";
import {
  ensureFranchiseSelectionSchema,
  loadFranchiseSelections,
  seedGmDraftSlots
} from "@/lib/franchise-db";

export const dynamic = "force-dynamic";

const TEAM_IDS = NBA_TEAMS.map((team) => team.id);
const FRANCHISE_SELECTIONS_LOCKED = true;
const LOCKED_SELECTION_ERROR = "La selection des franchises est verrouillee.";

type FranchiseSelectionPayload = {
  slot: number;
  teamId: string | null;
};

export async function GET() {
  try {
    const db = await prepareFranchiseSelectionDb();

    return selectionsResponse(db);
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  const payload = await parsePayload(request);

  if (!payload) {
    return NextResponse.json(
      { error: "Selection de franchise invalide." },
      { status: 400 }
    );
  }

  if (FRANCHISE_SELECTIONS_LOCKED) {
    return lockedSelectionResponse();
  }

  try {
    const db = await prepareFranchiseSelectionDb();

    return selectionsResponse(db);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "Cette franchise est deja attribuee." },
        { status: 409 }
      );
    }

    return databaseErrorResponse(error);
  }
}

export async function DELETE() {
  if (FRANCHISE_SELECTIONS_LOCKED) {
    return lockedSelectionResponse();
  }

  try {
    const db = await prepareFranchiseSelectionDb();

    return selectionsResponse(db);
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

function lockedSelectionResponse() {
  return NextResponse.json({ error: LOCKED_SELECTION_ERROR }, { status: 423 });
}

async function prepareFranchiseSelectionDb() {
  const db = getDraftDbClient();

  await ensureFranchiseSelectionSchema(db);
  await seedGmDraftSlots(db);

  return db;
}

async function selectionsResponse(db: DraftDbClient) {
  return NextResponse.json({
    selections: await loadFranchiseSelections(db, TEAM_IDS)
  });
}

async function parsePayload(
  request: Request
): Promise<FranchiseSelectionPayload | null> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return null;
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as Record<string, unknown>;
  const slot = candidate.slot;
  const teamId = candidate.teamId;

  if (
    typeof slot !== "number" ||
    !Number.isInteger(slot) ||
    slot < 1 ||
    slot > NBA_TEAMS.length
  ) {
    return null;
  }

  if (
    teamId !== null &&
    (typeof teamId !== "string" || !TEAM_IDS.includes(teamId))
  ) {
    return null;
  }

  return {
    slot,
    teamId
  };
}

function isUniqueViolation(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }

  return error.code === "23505";
}

function databaseErrorResponse(error: unknown) {
  console.error("Franchise selection database error", error);

  return NextResponse.json(
    { error: "La base de donnees est indisponible." },
    { status: 500 }
  );
}
