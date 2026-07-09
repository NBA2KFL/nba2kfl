export type RedraftPickDiscordNotification = {
  gmName: string;
  pickNumber: number;
  playerName: string;
  round: number;
  roundPick: number;
  teamName: string | null;
};

type WebhookFetch = (input: string, init: RequestInit) => Promise<Response>;

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

export async function sendRedraftPickDiscordNotification(
  webhookUrl: string,
  notification: RedraftPickDiscordNotification,
  fetcher: WebhookFetch = fetch
) {
  const response = await fetcher(webhookUrl, {
    body: JSON.stringify({
      allowed_mentions: { parse: [] },
      content: formatRedraftPickDiscordContent(notification)
    }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error("Discord webhook notification failed.");
  }
}
