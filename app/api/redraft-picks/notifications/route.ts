import { NextResponse } from "next/server";
import { NBA_TEAMS } from "@/data/teams";
import { getDraftDbClient } from "@/lib/draft-db";
import {
  sendRedraftPickDiscordNotification,
  type RedraftPickDiscordNotification
} from "@/lib/discord-webhook";
import {
  getNbaTeamLogoUrl,
  getPlayerPortraitUrl
} from "@/lib/nba-media";
import {
  ensureNba2kRosterSchema,
  loadRosterPlayerMedia
} from "@/lib/nba2k-roster-db";

export const dynamic = "force-dynamic";

type RedraftPickNotificationRequest = Omit<
  RedraftPickDiscordNotification,
  "playerPortraitUrl" | "teamLogoUrl"
> & {
  playerSourceId: number;
  teamId: string;
};

const TEAMS_BY_ID = new Map(NBA_TEAMS.map((team) => [team.id, team]));

export async function POST(request: Request) {
  const notification = await parsePayload(request);

  if (!notification) {
    return NextResponse.json(
      { error: "Notification redraft invalide." },
      { status: 400 }
    );
  }

  const webhookUrl = process.env.DISCORD_DRAFT_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    return NextResponse.json(
      { error: "Webhook Discord non configure." },
      { status: 503 }
    );
  }

  try {
    const db = getDraftDbClient();

    await ensureNba2kRosterSchema(db);

    const playerMedia = await loadRosterPlayerMedia(
      db,
      notification.playerSourceId
    );
    const team = TEAMS_BY_ID.get(notification.teamId);

    await sendRedraftPickDiscordNotification(webhookUrl, {
      gmName: notification.gmName,
      pickNumber: notification.pickNumber,
      playerName: notification.playerName,
      round: notification.round,
      roundPick: notification.roundPick,
      teamName: team?.name ?? notification.teamName,
      teamLogoUrl: team ? getNbaTeamLogoUrl(team.nbaTeamId) : null,
      playerPortraitUrl: getPlayerPortraitUrl(
        playerMedia?.nbaPlayerId ?? null,
        process.env.BETTER_AUTH_URL
      )
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Discord redraft pick notification error", error);

    return NextResponse.json(
      { error: "Notification Discord indisponible." },
      { status: 502 }
    );
  }
}

async function parsePayload(
  request: Request
): Promise<RedraftPickNotificationRequest | null> {
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
  const gmName = toNonEmptyString(candidate.gmName);
  const playerName = toNonEmptyString(candidate.playerName);
  const teamName = toNullableString(candidate.teamName);
  const teamId = toNonEmptyString(candidate.teamId);

  if (
    !gmName ||
    !playerName ||
    !teamId ||
    !TEAMS_BY_ID.has(teamId) ||
    teamName === undefined ||
    !isNonZeroInteger(candidate.playerSourceId) ||
    !isPositiveInteger(candidate.pickNumber) ||
    !isPositiveInteger(candidate.round) ||
    !isPositiveInteger(candidate.roundPick)
  ) {
    return null;
  }

  return {
    gmName,
    pickNumber: candidate.pickNumber,
    playerName,
    playerSourceId: candidate.playerSourceId,
    round: candidate.round,
    roundPick: candidate.roundPick,
    teamId,
    teamName
  };
}

function isNonZeroInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value !== 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function toNonEmptyString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue ? trimmedValue : null;
}

function toNullableString(value: unknown) {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  return value.trim() || null;
}
