import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { NBA_TEAMS } from "@/data/teams";
import {
  AdminAuthRequiredError,
  requireAdminEmail
} from "@/lib/admin-auth";
import { auth } from "@/lib/auth";
import { getDraftDbClient } from "@/lib/draft-db";
import {
  createRedraftRecapDiscordPayloads,
  sendDiscordWebhookPayloads
} from "@/lib/discord-webhook";
import { GM_DRAFT_SLOT_LINKS } from "@/lib/redraft";
import { loadRedraftPickRecap } from "@/lib/redraft-picks";

export const dynamic = "force-dynamic";

const GM_NAMES_BY_SLOT = new Map(
  GM_DRAFT_SLOT_LINKS.map((link) => [link.slot, link.gmName])
);
const TEAM_NAMES_BY_ID = new Map(
  NBA_TEAMS.map((team) => [team.id, team.name])
);

export async function POST() {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    requireAdminEmail(session);
  } catch (error) {
    if (error instanceof AdminAuthRequiredError) {
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

  const webhookUrl = process.env.DISCORD_DRAFT_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    return NextResponse.json(
      { error: "Webhook Discord non configure." },
      { status: 503 }
    );
  }

  let rows;

  try {
    rows = await loadRedraftPickRecap(getDraftDbClient());
  } catch (error) {
    console.error("Redraft recap database error", error);

    return NextResponse.json(
      { error: "La base de donnees redraft est indisponible." },
      { status: 500 }
    );
  }

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Aucun pick valide a recapitulé." },
      { status: 409 }
    );
  }

  const payloads = createRedraftRecapDiscordPayloads(
    rows.map((row) => ({
      pickNumber: row.pickNumber,
      round: row.round,
      roundPick: row.roundPick,
      gmName: GM_NAMES_BY_SLOT.get(row.slot) ?? `GM #${row.slot}`,
      teamName:
        TEAM_NAMES_BY_ID.get(row.franchiseTeamId) ??
        `Franchise ${row.franchiseTeamId.toUpperCase()}`,
      playerName: row.playerName
    }))
  );

  try {
    await sendDiscordWebhookPayloads(webhookUrl, payloads);
  } catch (error) {
    console.error("Discord redraft recap error", error);

    return NextResponse.json(
      { error: "Notification Discord indisponible." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    pickCount: rows.length,
    messageCount: payloads.length
  });
}
