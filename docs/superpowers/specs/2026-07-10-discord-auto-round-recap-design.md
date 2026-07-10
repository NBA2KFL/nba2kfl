# Automatic End-of-Round Discord Recap Design

## Goal

Automatically send one plain-text Discord recap when a redraft round becomes complete. The existing admin-triggered visual recap remains unchanged; automatic round recaps intentionally contain no logos, portraits, thumbnails, or card embeds.

## Automatic Message Format

For a completed round, send one webhook message with plain `content`:

```text
🏁 TOUR 1 TERMINÉ

#1 · Anna · Victor Wembanyama
#2 · Elias · Shai Gilgeous-Alexander
```

Picks are ordered by pick number and include pick number, GM name, and selected player name. The message includes only picks from the completed round. It does not include team names, NBA images, Discord embeds, or mentions.

If the text exceeds Discord's content limit, split it into ordered messages while preserving the round heading on the first message and a continuation marker on later messages. The normal 2,000-character Discord content limit is the chunking boundary.

## Completion Detection

After a successful pick persistence operation, calculate the completed round from the canonical snake-draft picks and persisted pick numbers. A round is complete only when every pick in that round has a non-empty persisted player selection.

Clearing a pick never sends a recap. Updating an already selected pick does not send a second recap for a completed round.

## Idempotency

Create a `redraft_round_recaps` table:

```sql
CREATE TABLE IF NOT EXISTS redraft_round_recaps (
  round integer PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('pending', 'sent')),
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
)
```

When a round first becomes complete, claim it with `INSERT ... ON CONFLICT (round) DO NOTHING RETURNING round`. Only the request that receives the inserted row may send the automatic recap. This prevents duplicate Discord messages from browser retries or simultaneous final-pick requests.

The pick remains persisted if Discord delivery fails. Failed claims remain `pending`; later pick requests call a retry helper before checking the newly completed round. The existing manual recap button remains the operational fallback for a failed automatic send.

## Data Flow

1. `PATCH /api/redraft-picks` persists the selected player.
2. The route emits the existing `redraft_pick_changed` event.
3. The route loads the completed round's persisted picks and claims the round recap.
4. If the claim succeeds, it formats plain text and sends through the existing webhook sender with `allowed_mentions.parse = []`.
5. On success, it marks the claim `sent` with `sent_at`.
6. On failure, it leaves the claim `pending`, logs a redacted error, and still returns the persisted picks response.

The automatic path uses a dedicated plain-content sender and never calls the visual embed formatter. The admin recap endpoint continues to use media-aware embeds.

## Security and Reliability

- Automatic sends happen only after authenticated, authorized pick persistence.
- No client-provided round-completion flag is trusted.
- No pick data is deleted or rolled back because Discord is unavailable.
- Webhook URLs remain server-only.
- Mentions remain disabled.
- Repeated PATCH requests cannot duplicate a claimed round.

## Testing

Add tests for:

1. Schema creation and idempotent round claim.
2. Plain-text formatting with ordered picks and no media fields.
3. Content-limit chunking.
4. Round completion with all picks present.
5. Incomplete rounds not sending.
6. Clearing/updating picks not sending a new recap.
7. Duplicate completion requests sending once.
8. Discord failure preserving the pending claim and successful pick response.
9. Retry of a pending claim on a later request.
10. Existing visual recap behavior remaining unchanged.

## Scope Boundaries

- No automatic visual embeds.
- No logos or portraits in automatic messages.
- No scheduled jobs or external queue.
- No changes to pick ownership or validation rules.
- No automatic recap when a pick is cleared.
