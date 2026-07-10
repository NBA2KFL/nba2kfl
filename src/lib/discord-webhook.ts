export type RedraftPickDiscordNotification = {
  gmName: string;
  pickNumber: number;
  playerName: string;
  round: number;
  roundPick: number;
  teamName: string | null;
  teamLogoUrl: string | null;
  playerPortraitUrl: string | null;
};
export type RedraftRecapItem = {
  pickNumber: number;
  round: number;
  roundPick: number;
  gmName: string;
  teamName: string;
  playerName: string;
  teamLogoUrl: string | null;
  playerPortraitUrl: string | null;
};
export type DiscordWebhookPayload = {
  allowed_mentions: { parse: string[] };
  embeds: DiscordEmbed[];
};

type DiscordEmbed = {
  author?: {
    name: string;
    icon_url?: string;
  };
  color: number;
  title: string;
  description: string;
  footer: { text: string };
  thumbnail?: { url: string };
  timestamp: string;
};

type WebhookFetch = (input: string, init: RequestInit) => Promise<Response>;

const NBA2KFL_GOLD = 0xf5b335;
const DISCORD_EMBEDS_PER_MESSAGE = 10;

export function formatRedraftPickDiscordContent({
  gmName,
  pickNumber,
  playerName,
  round,
  roundPick,
  teamName
}: RedraftPickDiscordNotification) {
  const franchiseLabel = teamName ? ` (${teamName})` : "";

  return [
    `Pick redraft valide #${pickNumber} (T${round}.${roundPick})`,
    `${gmName}${franchiseLabel} selectionne ${playerName}.`
  ].join("\n");
}

export function createRedraftPickDiscordPayload(
  notification: RedraftPickDiscordNotification,
  timestamp = new Date().toISOString()
): DiscordWebhookPayload {
  return {
    allowed_mentions: { parse: [] },
    embeds: [createPickEmbed(notification, timestamp)]
  };
}

export function createRedraftRecapDiscordPayloads(
  items: readonly RedraftRecapItem[],
  timestamp = new Date().toISOString()
): DiscordWebhookPayload[] {
  if (items.length === 0) {
    return [];
  }

  const sortedItems = items.toSorted(
    (first, second) => first.pickNumber - second.pickNumber
  );
  const payloads: DiscordWebhookPayload[] = [];

  for (
    let index = 0;
    index < sortedItems.length;
    index += DISCORD_EMBEDS_PER_MESSAGE
  ) {
    payloads.push({
      allowed_mentions: { parse: [] },
      embeds: sortedItems
        .slice(index, index + DISCORD_EMBEDS_PER_MESSAGE)
        .map((item) => createPickEmbed(item, timestamp))
    });
  }

  return payloads;
}

function createPickEmbed(
  pick: RedraftPickDiscordNotification | RedraftRecapItem,
  timestamp: string
): DiscordEmbed {
  const author = pick.teamName
    ? {
        name: pick.teamName,
        ...(pick.teamLogoUrl ? { icon_url: pick.teamLogoUrl } : {})
      }
    : undefined;

  return {
    ...(author ? { author } : {}),
    color: NBA2KFL_GOLD,
    description: `**${pick.gmName}** sélectionne\n➡️ **${pick.playerName}**`,
    footer: { text: `NBA2KFL · Pick #${pick.pickNumber}` },
    ...(pick.playerPortraitUrl
      ? { thumbnail: { url: pick.playerPortraitUrl } }
      : {}),
    timestamp,
    title: `🏀 PICK VALIDÉ · T${pick.round}.${pick.roundPick}`
  };
}

export async function sendRedraftPickDiscordNotification(
  webhookUrl: string,
  notification: RedraftPickDiscordNotification,
  fetcher: WebhookFetch = fetch
) {
  await sendDiscordWebhookPayloads(
    webhookUrl,
    [createRedraftPickDiscordPayload(notification)],
    fetcher
  );
}

export async function sendDiscordWebhookPayloads(
  webhookUrl: string,
  payloads: readonly DiscordWebhookPayload[],
  fetcher: WebhookFetch = fetch
) {
  for (const payload of payloads) {
    const response = await fetcher(webhookUrl, {
      body: JSON.stringify(payload),
      headers: { "content-type": "application/json" },
      method: "POST"
    });

    if (!response.ok) {
      throw new Error("Discord webhook notification failed.");
    }
  }
}
