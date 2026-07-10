# Discord Redraft Recap Design

## Goal

Give administrators a safe, visible way to send a polished Discord recap of every persisted redraft pick, while applying the same visual language to future individual pick notifications. After implementation and verification, send the first recap using the current database state.

## User Experience

- Administrators see an `Envoyer le récap Discord` button in the redraft action area.
- Non-administrators do not see the button.
- The button is disabled while a recap is being generated and sent, preventing accidental duplicate submissions from the same page interaction.
- A successful request displays a concise confirmation with the number of included picks.
- A failed request displays the server-provided error without altering draft state.
- Sending a recap does not create, update, or delete any picks.

## Server Architecture

Add an admin-only recap route under the existing redraft notification API. The route will:

1. Resolve the current authenticated session.
2. Reject unauthenticated and non-admin callers before querying recap data or contacting Discord.
3. Read persisted picks ordered by pick number, including pick number, round, round pick, GM slot, franchise team ID, player name, and validation time.
4. Resolve GM and franchise display names from the repository's canonical draft-slot and team data.
5. Return a clear empty-state response when no picks are validated.
6. Format and send one or more Discord webhook messages.
7. Return the number of summarized picks and Discord messages to the client.

The existing per-pick notification route remains responsible only for individual notifications. Shared Discord payload types and formatting belong in `src/lib/discord-webhook.ts` so they can be tested without a network call.

## Discord Presentation

Both individual notifications and recaps use rich embeds with:

- an NBA2KFL red/gold accent color;
- a clear basketball-themed title;
- concise French copy;
- a footer identifying NBA2KFL;
- a timestamp;
- `allowed_mentions.parse` set to an empty array.

The recap title is `🏀 RÉCAP REDRAFT NBA2KFL`. Its description groups picks by round and renders each line as:

`#7 · Chris · San Antonio Spurs → Victor Wembanyama`

The footer reports the total validated-pick count. The formatter preserves pick order and chunks the recap across multiple webhook messages before Discord's per-message embed character limit is reached. Each chunk stays below 6,000 combined embed characters and uses no more than Discord's allowed embed count.

No custom image asset or external image URL is required; the color, typography supplied by Discord, emoji, hierarchy, and spacing provide the visual treatment without introducing another runtime dependency.

## Data Model

Extend the redraft-pick persistence module with a read-only recap query returning a dedicated row type. Existing pick loading behavior remains unchanged.

Each recap item contains:

- `pickNumber`
- `round`
- `roundPick`
- `slot`
- `franchiseTeamId`
- `playerName`
- `validatedAt`

GM names are resolved through `GM_DRAFT_SLOT_LINKS`; franchise names are resolved through `NBA_TEAMS`. Unknown IDs receive stable fallback labels rather than causing the entire recap to fail.

## Error Handling and Security

- Missing session: `401`.
- Authenticated non-admin user: `403`.
- No validated picks: `409` with a user-facing message.
- Missing webhook configuration: `503`.
- Discord rejection or network error: `502`.
- Database failure: `500`.
- The webhook URL is read only on the server and is never returned or logged.
- Discord mentions are disabled in every payload.
- The admin check occurs server-side; hiding the button is only a usability measure.

## Testing

Follow test-driven development:

1. Formatter tests for styled individual-pick embeds.
2. Formatter tests for ordered, round-grouped recap embeds and limit-aware chunking.
3. Persistence tests for recap-row mapping and ordering.
4. Route tests for admin success, authentication failure, authorization failure, empty state, webhook configuration failure, and Discord failure.
5. Component request-helper tests for recap success and error parsing.
6. Full Vitest suite and production Next.js build.

After all automated verification passes, invoke the protected recap behavior against the configured production-like database and webhook once, then report the returned pick and message counts. No fake picks are inserted for this send.

## Scope Boundaries

- No recurring or scheduled recaps.
- No recap history table.
- No webhook configuration UI.
- No Discord bot or interactive Discord components.
- No changes to pick validation or ownership rules.
