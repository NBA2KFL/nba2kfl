import type { DraftDbClient } from "./draft-db";
import {
  formatRedraftRoundRecapContent,
  sendRedraftRoundRecap,
  type RedraftRoundRecapItem
} from "./discord-webhook";
import {
  claimRedraftRoundRecap,
  loadPendingRedraftRounds,
  markRedraftRoundRecapSent
} from "./redraft-round-recaps";
import { loadRedraftRoundRecapItems } from "./redraft-picks";
import { GM_DRAFT_SLOT_LINKS, type RedraftPicksByNumber, type SnakeDraftPick } from "./redraft";

export function getCompletedRedraftRounds(
  draftPicks: readonly SnakeDraftPick[],
  picks: RedraftPicksByNumber
) {
  return [...new Set(draftPicks.map((pick) => pick.round))].filter((round) => {
    const roundPicks = draftPicks.filter((pick) => pick.round === round);
    return roundPicks.length > 0 && roundPicks.every((pick) => Boolean(picks[pick.pickNumber]));
  });
}

export async function dispatchAutomaticRoundRecaps(
  db: DraftDbClient,
  draftPicks: readonly SnakeDraftPick[],
  picks: RedraftPicksByNumber
) {
  const webhookUrl = process.env.DISCORD_DRAFT_WEBHOOK_URL?.trim();
  if (!webhookUrl) return { sentRounds: [], failedRounds: [] };

  const rounds = new Set([
    ...getCompletedRedraftRounds(draftPicks, picks),
    ...(await loadPendingRedraftRounds(db))
  ]);
  const sentRounds: number[] = [];
  const failedRounds: number[] = [];

  for (const round of [...rounds].sort((a, b) => a - b)) {
    const complete = getCompletedRedraftRounds(draftPicks, picks).includes(round);
    if (!complete) continue;
    const claimed = await claimRedraftRoundRecap(db, round);
    if (!claimed) continue;
    try {
      const rows = await loadRedraftRoundRecapItems(db, round);
      const items: RedraftRoundRecapItem[] = rows.map((row) => ({
        pickNumber: row.pickNumber,
        gmName: GM_DRAFT_SLOT_LINKS.find((link) => link.slot === row.slot)?.gmName ?? `GM ${row.slot}`,
        playerName: row.playerName
      }));
      await sendRedraftRoundRecap(webhookUrl, formatRedraftRoundRecapContent(round, items));
      await markRedraftRoundRecapSent(db, round);
      sentRounds.push(round);
    } catch (error) {
      failedRounds.push(round);
      console.error("Automatic redraft round recap failed.", error);
    }
  }
  return { sentRounds, failedRounds };
}
