import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { NBA_TEAMS } from "@/data/teams";
import { requireAdminEmail } from "@/lib/admin-auth";
import { auth } from "@/lib/auth";
import { getDraftDbClient, type DraftDbClient } from "@/lib/draft-db";
import {
  ensureFranchiseSelectionSchema,
  loadFranchiseOwnership,
  seedGmDraftSlots
} from "@/lib/franchise-db";

export const dynamic = "force-dynamic";

const TEAM_IDS = NBA_TEAMS.map((team) => team.id);

export async function GET() {
  try {
    await requireAdmin();
  } catch (error) {
    return adminErrorResponse(error);
  }

  try {
    const db = await prepareFranchiseOwnershipDb();

    return ownershipResponse(db);
  } catch (error) {
    return databaseErrorResponse(error);
  }
}

export async function prepareFranchiseOwnershipDb() {
  const db = getDraftDbClient();

  await ensureFranchiseSelectionSchema(db);
  await seedGmDraftSlots(db);

  return db;
}

export async function ownershipResponse(db: DraftDbClient) {
  return NextResponse.json(await loadFranchiseOwnership(db, TEAM_IDS));
}

export async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  return requireAdminEmail(session);
}

export function adminErrorResponse(error: unknown) {
  if (error instanceof Error && error.message === "Authentication required.") {
    return NextResponse.json(
      { error: "Connexion requise." },
      { status: 401 }
    );
  }

  return NextResponse.json(
    { error: "Acces admin requis." },
    { status: 403 }
  );
}

export function databaseErrorResponse(error: unknown) {
  console.error("Franchise ownership database error", error);

  return NextResponse.json(
    { error: "La base de donnees est indisponible." },
    { status: 500 }
  );
}
