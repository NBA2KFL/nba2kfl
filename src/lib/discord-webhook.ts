export type RedraftPickDiscordNotification = {
  gmName: string;
  pickNumber: number;
  playerName: string;
  round: number;
  roundPick: number;
  teamName: string | null;
};
export type RedraftRecapItem = {
  pickNumber: number;
  round: number;
  roundPick: number;
  gmName: string;
  teamName: string;
  playerName: string;
};
export type DiscordWebhookPayload = {
  allowed_mentions: { parse: string[] };
  embeds: DiscordEmbed[];
};

type DiscordEmbed = {
  color: number;
  title: string;
  description: string;
  footer: { text: string };
  timestamp: string;
};

type WebhookFetch = (input: string, init: RequestInit) => Promise<Response>;

const NBA2KFL_GOLD = 0xf5b335;
const DISCORD_EMBED_TEXT_LIMIT = 5800;
const REDRAFT_RECAP_TITLE = "🏀 RÉCAP REDRAFT NBA2KFL";

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
  const teamLabel = notification.teamName ? ` · ${notification.teamName}` : "";

  return {
    allowed_mentions: { parse: [] },
    embeds: [
      {
        color: NBA2KFL_GOLD,
        description: `**${notification.gmName}**${teamLabel}\n➡️ **${notification.playerName}**`,
        footer: { text: `NBA2KFL · Pick #${notification.pickNumber}` },
        timestamp,
        title: `🏀 PICK VALIDÉ · T${notification.round}.${notification.roundPick}`
      }
    ]
  };
}

export function createRedraftRecapDiscordPayloads(
  items: readonly RedraftRecapItem[],
  timestamp = new Date().toISOString()
): DiscordWebhookPayload[] {
  if (items.length === 0) {
    return [];
  }

  const footerText = `${items.length} picks validés · NBA2KFL`;
  const descriptions: string[] = [];
  let lines: string[] = [];
  let currentRound: number | null = null;

  for (const item of items.toSorted((first, second) => first.pickNumber - second.pickNumber)) {
    const isNewRound = item.round !== currentRound;
    const headingLines = isNewRound
      ? [...(lines.length > 0 ? [""] : []), `**TOUR ${item.round}**`]
      : [];
    const pickLine = `\`#${item.pickNumber}\` · **${item.gmName}** · ${item.teamName} → **${item.playerName}**`;
    const candidateLines = [...lines, ...headingLines, pickLine];

    if (
      lines.length > 0 &&
      getEmbedTextLength(candidateLines.join("\n"), footerText) >
        DISCORD_EMBED_TEXT_LIMIT
    ) {
      descriptions.push(lines.join("\n"));
      lines = [`**TOUR ${item.round}**`, pickLine];
    } else {
      lines = candidateLines;
    }

    currentRound = item.round;
  }

  if (lines.length > 0) {
    descriptions.push(lines.join("\n"));
  }

  return descriptions.map((description) => ({
    allowed_mentions: { parse: [] },
    embeds: [
      {
        color: NBA2KFL_GOLD,
        description,
        footer: { text: footerText },
        timestamp,
        title: REDRAFT_RECAP_TITLE
      }
    ]
  }));
}

function getEmbedTextLength(description: string, footerText: string) {
  return REDRAFT_RECAP_TITLE.length + description.length + footerText.length;
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
