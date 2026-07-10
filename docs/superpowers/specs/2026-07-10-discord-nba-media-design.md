# Discord NBA Media Design

## Goal

Enrich individual redraft notifications and admin recaps with official NBA team logos and compact player headshots. Preserve reliable webhook delivery by resolving NBA player identifiers during roster synchronization instead of calling NBA services while sending a webhook.

## Visual Format

Each validated pick is represented by one compact Discord embed:

- NBA2KFL gold accent color;
- team name and official team logo in the embed author area;
- pick and round information in the title;
- GM and selected player in the description;
- compact player portrait in the embed thumbnail;
- NBA2KFL pick information in the footer;
- validation or send timestamp.

Recaps contain one embed per pick, ordered by pick number. Discord permits at most ten embeds per webhook message, so recap payloads are chunked into groups of ten. A 17-pick recap therefore sends two Discord messages. Existing mention suppression remains enabled for every payload.

## NBA Identifier Resolution

Current `source_player_id` values come from NBA2KLab and do not match official NBA `personId` values. Add a nullable `nba_player_id` column to `nba2k_roster_players`.

During roster synchronization:

1. Fetch the official NBA active-player directory from `commonallplayers` for league `00`, current players only, and season `NBA_STATS_SEASON`.
2. Parse player `personId` and display name.
3. Normalize names with the same accent-, punctuation-, and case-insensitive rules used by the roster importer.
4. Match normalized NBA names against corrected NBA2KFL roster names.
5. Persist the matched `personId` as `nba_player_id`.
6. Preserve an existing non-null `nba_player_id` when the NBA directory is unavailable or a player is not present.

NBA directory failure must not make the roster import unusable. It is reported in the synchronization result, while roster data continues to import and existing NBA IDs remain intact.

`NBA_STATS_SEASON` defaults to `2025-26`, matching the repository's NBA2K26 roster version, and can be overridden without a code change. The request uses the NBA site origin/referer headers required by the official Stats endpoint. The endpoint was verified during design with 582 current-player rows for `2025-26`.

The manual 2026 draft-class additions remain eligible for automatic matching when the NBA directory begins listing them. Until then, they use the fallback portrait.

## Media URLs

Create a focused NBA media module that constructs:

- team logo URLs from canonical `nbaTeamId` values;
- player headshot URLs from `nba_player_id` values;
- the public NBA2KFL fallback portrait URL.

Official NBA CDN URL construction is deterministic and contains no network call. The application origin comes from `BETTER_AUTH_URL`; the fallback asset is served from `public/images/player-silhouette.svg`. If the configured origin is not a valid public HTTPS URL, omit the fallback thumbnail rather than generating an unusable Discord URL.

The silhouette is an original neutral NBA2KFL asset, without NBA branding or a real player likeness.

## Persistence and Data Flow

Extend roster summaries and recap rows with `nbaPlayerId: number | null`.

When a pick is validated:

- the client includes the selected roster source ID and canonical franchise team ID in the existing notification request;
- the notification route loads the matching roster record server-side and uses its stored `nba_player_id`;
- the route resolves the team through canonical `NBA_TEAMS` data;
- untrusted client-supplied image URLs are never accepted.

For admin recaps:

- the recap query left-joins `redraft_picks` to `nba2k_roster_players` using the persisted roster source player ID and current roster source/version;
- the route passes resolved team and player media URLs to the Discord formatter;
- missing joins or NBA IDs use the fallback portrait without blocking the recap.

No derived CDN URL is stored in the database. Only stable numeric NBA IDs are persisted.

## Backfill

Add a reusable synchronization function and script command to resolve NBA IDs for existing roster rows. The implementation run will execute it once against the configured database, report matched/unmatched counts, and never alter picks.

After automated verification and backfill, send one new visual recap using all currently validated picks. Report the number of picks, Discord messages, official portraits, and fallbacks used.

## Error Handling

- NBA directory request failure: keep/import roster data, retain existing IDs, and report the media-sync failure.
- Invalid NBA directory payload: same non-destructive behavior as a request failure.
- Unknown player: persist no new NBA ID and use the silhouette.
- Unknown team: omit the author icon while keeping the team fallback label.
- Invalid or non-HTTPS application origin: omit the silhouette thumbnail.
- Discord image fetch failure: Discord may display text without the image; webhook delivery remains successful.
- Discord webhook rejection: retain the existing explicit delivery error behavior.

## Testing

Follow test-driven development for:

1. Official NBA directory parsing and normalized-name matching.
2. Preservation of existing IDs for unmatched players and NBA API failures.
3. Schema migration and roster persistence mapping.
4. Official team-logo and headshot URL construction.
5. Public HTTPS fallback construction and invalid-origin omission.
6. Compact individual embed structure.
7. Recap grouping into at most ten embeds per Discord message.
8. Notification-route server-side media resolution.
9. Recap-route media mapping and fallback behavior.
10. Full Vitest suite and production Next.js build.

## Scope Boundaries

- No NBA API request during webhook delivery.
- No image download or image caching in the application.
- No manual player-ID administration UI.
- No image proxy endpoint.
- No changes to draft validation, ownership, or pick persistence behavior.
- No use of NBA logos or portraits outside the requested Discord notifications.
