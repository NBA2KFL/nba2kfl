import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { NBA_TEAMS } from "@/data/teams";
import { auth } from "@/lib/auth";
import { AuthRequiredError, ForbiddenUserError, resolveCurrentUser } from "@/lib/current-user";
import { getDraftDbClient, type DraftDbClient } from "@/lib/draft-db";
import {
  ensureFranchiseSelectionSchema,
  loadFranchiseSelections,
  seedGmDraftSlots
} from "@/lib/franchise-db";
import {
  ensureNba2kRosterSchema,
  loadNba2kRosterPlayers
} from "@/lib/nba2k-roster-db";
import {
  clearRedraftPick,
  clearRedraftPicksForSlots,
  ensureRedraftPickSchema,
  loadRedraftPicks,
  upsertRedraftPick
} from "@/lib/redraft-picks";
import {
  createSnakeDraftPicks,
  GM_DRAFT_SLOT_LINKS,
  validateRedraftPickChange,
  type RedraftPicksByNumber,
  type SnakeDraftPick
} from "@/lib/redraft";

export const dynamic = "force-dynamic";

const TEAM_IDS = NBA_TEAMS.map((team) => team.id);
const USER_EMAILS_BY_DRAFT_SLOT = new Map(
  GM_DRAFT_SLOT_LINKS.map((link) => [link.slot, link.userEmail.toLowerCase()])
);
const DEFAULT_ROUNDS = 14;

type RedraftPickPayload = {
  pickNumber: number;
  playerName: string;
};

export async function GET() {
  try {
    const db = await prepareRedraftPickDb();

    return picksResponse(db);
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  const payload = await parsePayload(request);

  if (!payload) {
    return NextResponse.json(
      { error: "Selection joueur invalide." },
      { status: 400 }
    );
  }

  try {
    const db = await prepareRedraftPickDb();
    const user = await resolveRequestUser(db);
    const state = await loadRedraftState(db);
    const pick = state.draftPicks.find(
      (draftPick) => draftPick.pickNumber === payload.pickNumber
    );
    const currentPick = state.draftPicks.find(
      (draftPick) => !state.picks[draftPick.pickNumber]
    );

    if (!pick) {
      return NextResponse.json({ error: "Pick introuvable." }, { status: 404 });
    }

    if (!canUserEditPick(pick, user.email)) {
      return NextResponse.json(
        { error: "Ce pick ne vous appartient pas." },
        { status: 403 }
      );
    }

    const validation = validateRedraftPickChange({
      draftPicks: state.draftPicks,
      pickNumber: payload.pickNumber,
      picksByNumber: state.picks,
      playerName: payload.playerName,
      playerPool: state.players.map((player) => player.fullName)
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.message }, { status: 409 });
    }

    if (
      validation.playerName &&
      currentPick?.pickNumber !== payload.pickNumber &&
      !state.picks[payload.pickNumber]
    ) {
      return NextResponse.json(
        { error: `Valide d'abord le pick #${currentPick?.pickNumber}.` },
        { status: 409 }
      );
    }

    if (validation.playerName) {
      const player = state.players.find(
        (candidate) => candidate.fullName === validation.playerName
      );

      if (!player) {
        return NextResponse.json(
          { error: "Ce joueur n'est pas disponible." },
          { status: 409 }
        );
      }

      await upsertRedraftPick(db, pick, player, user.userId);
    } else {
      await clearRedraftPick(db, payload.pickNumber);
    }

    return picksResponse(db);
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function DELETE() {
  try {
    const db = await prepareRedraftPickDb();
    const user = await resolveRequestUser(db);
    const ownedSlots = GM_DRAFT_SLOT_LINKS.filter(
      (link) => link.userEmail.toLowerCase() === user.email
    ).map((link) => link.slot);

    await clearRedraftPicksForSlots(db, ownedSlots);

    return picksResponse(db);
  } catch (error) {
    return routeErrorResponse(error);
  }
}

async function prepareRedraftPickDb() {
  const db = getDraftDbClient();

  await ensureFranchiseSelectionSchema(db);
  await seedGmDraftSlots(db);
  await ensureNba2kRosterSchema(db);
  await ensureRedraftPickSchema(db);

  return db;
}

async function picksResponse(db: DraftDbClient) {
  return NextResponse.json({
    picks: await loadRedraftPicks(db)
  });
}

async function loadRedraftState(db: DraftDbClient) {
  const [selections, players, picks] = await Promise.all([
    loadFranchiseSelections(db, TEAM_IDS),
    loadNba2kRosterPlayers(db),
    loadRedraftPicks(db)
  ]);

  return {
    draftPicks: createSnakeDraftPicks(selections, DEFAULT_ROUNDS),
    picks,
    players
  };
}

async function resolveRequestUser(db: DraftDbClient) {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  return resolveCurrentUser(db, session);
}

async function parsePayload(request: Request): Promise<RedraftPickPayload | null> {
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

  if (
    typeof candidate.pickNumber !== "number" ||
    !Number.isInteger(candidate.pickNumber) ||
    candidate.pickNumber < 1 ||
    typeof candidate.playerName !== "string"
  ) {
    return null;
  }

  return {
    pickNumber: candidate.pickNumber,
    playerName: candidate.playerName
  };
}

function canUserEditPick(pick: SnakeDraftPick, userEmail: string) {
  return USER_EMAILS_BY_DRAFT_SLOT.get(pick.selection.slot) === userEmail;
}

function routeErrorResponse(error: unknown) {
  if (error instanceof AuthRequiredError) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }

  if (error instanceof ForbiddenUserError) {
    return NextResponse.json({ error: "Acces GM requis." }, { status: 403 });
  }

  if (isUniqueViolation(error)) {
    return NextResponse.json(
      { error: "Ce joueur est deja pris." },
      { status: 409 }
    );
  }

  return databaseErrorResponse(error);
}

function isUniqueViolation(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }

  return error.code === "23505";
}

function databaseErrorResponse(error: unknown) {
  console.error("Redraft picks database error", error);

  return NextResponse.json(
    { error: "La base de donnees redraft est indisponible." },
    { status: 500 }
  );
}
