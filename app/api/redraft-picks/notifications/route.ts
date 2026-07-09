import { NextResponse } from "next/server";
import {
  sendRedraftPickDiscordNotification,
  type RedraftPickDiscordNotification
} from "@/lib/discord-webhook";

export const dynamic = "force-dynamic";

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
    await sendRedraftPickDiscordNotification(webhookUrl, notification);

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
): Promise<RedraftPickDiscordNotification | null> {
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

  if (
    !gmName ||
    !playerName ||
    teamName === undefined ||
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
    round: candidate.round,
    roundPick: candidate.roundPick,
    teamName
  };
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
