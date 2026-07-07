import { NextResponse } from "next/server";
import { NBA_TEAMS } from "@/data/teams";
import {
  adminErrorResponse,
  databaseErrorResponse,
  ownershipResponse,
  prepareFranchiseOwnershipDb,
  requireAdmin
} from "../../route";
import {
  clearFranchiseOwner,
  setFranchiseOwner
} from "@/lib/franchise-db";

type RouteContext = {
  params: Promise<{
    teamId: string;
  }>;
};

type OwnerPayload = {
  userId: string | null;
  label: string | null;
  isPrimary: boolean;
};

const TEAM_IDS = new Set(NBA_TEAMS.map((team) => team.id));

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdmin();
  } catch (error) {
    return adminErrorResponse(error);
  }

  const { teamId } = await context.params;

  if (!TEAM_IDS.has(teamId)) {
    return NextResponse.json(
      { error: "Franchise introuvable." },
      { status: 404 }
    );
  }

  const payload = await parsePayload(request);

  if (!payload) {
    return NextResponse.json(
      { error: "Proprietaire de franchise invalide." },
      { status: 400 }
    );
  }

  try {
    const db = await prepareFranchiseOwnershipDb();

    if (payload.userId) {
      await setFranchiseOwner(
        db,
        teamId,
        payload.userId,
        payload.label,
        payload.isPrimary
      );
    } else {
      await clearFranchiseOwner(db, teamId);
    }

    return ownershipResponse(db);
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

async function parsePayload(request: Request): Promise<OwnerPayload | null> {
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
  const userId = candidate.userId;
  const label = candidate.label;
  const isPrimary = candidate.isPrimary;

  if (userId !== null && typeof userId !== "string") {
    return null;
  }

  if (label !== null && typeof label !== "string") {
    return null;
  }

  if (typeof isPrimary !== "boolean") {
    return null;
  }

  return {
    userId,
    label: typeof label === "string" && label.trim() ? label.trim() : null,
    isPrimary
  };
}

function isUniqueViolation(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }

  return error.code === "23505";
}
