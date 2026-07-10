# Discord NBA Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add official NBA team logos and compact player portraits to individual and recap Discord webhooks, with synchronized NBA person IDs and a public NBA2KFL fallback silhouette.

**Architecture:** Resolve NBA `personId` values outside webhook delivery through a dedicated NBA directory module and persist them on roster rows. Keep deterministic CDN URL construction in a media module, pass only server-resolved URLs into the Discord formatter, and render one compact embed per pick in batches of at most ten embeds.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Neon Postgres, NBA Stats `commonallplayers`, NBA CDN, Discord incoming webhooks, Vitest 4.

## Global Constraints

- Never call the NBA API while sending a webhook.
- Never accept image URLs from the client.
- Store only stable numeric NBA IDs, not derived CDN URLs.
- Preserve existing non-null NBA IDs when the NBA directory is unavailable or a name is unmatched.
- Use official NBA team logos and headshots only in the requested Discord notifications.
- Use `public/images/player-silhouette.svg` only through a valid public HTTPS `BETTER_AUTH_URL`.
- Omit an invalid fallback URL instead of sending an unusable thumbnail.
- Keep mentions disabled in every Discord payload.
- Send at most ten embeds per Discord message.
- Do not change draft validation, ownership, or pick persistence behavior.
- Add no runtime dependency.
- Follow red-green-refactor for each behavior change.

---

### Task 1: Parse and match the official NBA player directory

**Files:**
- Create: `src/lib/nba-player-directory.ts`
- Create: `src/lib/nba-player-directory.test.ts`

**Interfaces:**
- Produces: `NbaDirectoryPlayer`, `fetchNbaPlayerDirectory`, `parseNbaPlayerDirectory`, `normalizeNbaPlayerName`, and `indexNbaPlayerIdsByName`.
- Consumed by: the roster media-ID synchronizer in Task 3.

- [ ] **Step 1: Write failing parser and normalization tests**

```ts
import { describe, expect, it, vi } from "vitest";
import {
  fetchNbaPlayerDirectory,
  indexNbaPlayerIdsByName,
  normalizeNbaPlayerName,
  parseNbaPlayerDirectory
} from "./nba-player-directory";

const payload = {
  resultSets: [{
    headers: ["PERSON_ID", "DISPLAY_FIRST_LAST", "ROSTERSTATUS"],
    rowSet: [
      [1641705, "Victor Wembanyama", 1],
      [1629029, "Luka Dončić", 1]
    ]
  }]
};

it("parses NBA person ids and display names", () => {
  expect(parseNbaPlayerDirectory(payload)).toEqual([
    { nbaPlayerId: 1641705, fullName: "Victor Wembanyama" },
    { nbaPlayerId: 1629029, fullName: "Luka Dončić" }
  ]);
});

it("matches names without accents, punctuation, or case", () => {
  expect(normalizeNbaPlayerName(" Luka Dončić Jr. ")).toBe("luka doncic jr");
  expect(indexNbaPlayerIdsByName(parseNbaPlayerDirectory(payload)).get("luka doncic"))
    .toBe(1629029);
});

it("requests current NBA players for the configured season", async () => {
  const fetchImpl = vi.fn().mockResolvedValue(Response.json(payload));
  await fetchNbaPlayerDirectory({ season: "2025-26", fetchImpl });
  expect(fetchImpl).toHaveBeenCalledWith(
    expect.stringContaining("Season=2025-26"),
    expect.objectContaining({ headers: expect.objectContaining({ Referer: "https://www.nba.com/" }) })
  );
});
```

Add invalid-payload and non-OK-response assertions that throw `NBA player directory returned an invalid payload.` and `NBA player directory request failed: 503.` respectively.

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm test -- src/lib/nba-player-directory.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the minimal NBA directory module**

Use the endpoint:

```ts
const NBA_DIRECTORY_URL = "https://stats.nba.com/stats/commonallplayers";

export async function fetchNbaPlayerDirectory({
  season = process.env.NBA_STATS_SEASON?.trim() || "2025-26",
  fetchImpl = fetch
}: {
  season?: string;
  fetchImpl?: typeof fetch;
} = {}) {
  const url = new URL(NBA_DIRECTORY_URL);
  url.searchParams.set("LeagueID", "00");
  url.searchParams.set("Season", season);
  url.searchParams.set("IsOnlyCurrentSeason", "1");
  const response = await fetchImpl(url, {
    headers: {
      Origin: "https://www.nba.com",
      Referer: "https://www.nba.com/",
      "User-Agent": "Mozilla/5.0"
    }
  });
  if (!response.ok) {
    throw new Error(`NBA player directory request failed: ${response.status}.`);
  }
  return parseNbaPlayerDirectory(await response.json());
}
```

Parse columns by header name rather than fixed position. Normalize with Unicode NFD accent removal, lowercasing, apostrophe/hyphen-to-space conversion, non-alphanumeric removal, and collapsed whitespace.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `pnpm test -- src/lib/nba-player-directory.test.ts`

Expected: all directory tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/nba-player-directory.ts src/lib/nba-player-directory.test.ts
git commit -m "feat: resolve official NBA player ids"
```

### Task 2: Persist nullable NBA player IDs on roster rows

**Files:**
- Modify: `src/lib/nba2k-roster-db.ts`
- Modify: `src/lib/nba2k-roster-db.test.ts`

**Interfaces:**
- Consumes: normalized name-to-ID mappings from Task 1.
- Produces: `nbaPlayerId` on `Nba2kRosterPlayerSummary`, `RosterPlayerIdentity`, `loadRosterPlayerIdentities`, and `updateRosterNbaPlayerIds`.

- [ ] **Step 1: Write failing schema, mapping, and preservation tests**

Update expected summaries with `nbaPlayerId: null`. Add:

```ts
it("adds a nullable NBA player id column", async () => {
  const db = createDbClient();
  await ensureNba2kRosterSchema(db);
  expect(db.query).toHaveBeenCalledWith(
    expect.stringContaining("ADD COLUMN IF NOT EXISTS nba_player_id bigint")
  );
});

it("loads roster identities for NBA id matching", async () => {
  const db = createDbClient([[{
    source_player_id: 400,
    full_name: "Victor Wembanyama",
    nba_player_id: null
  }]]);
  await expect(loadRosterPlayerIdentities(db)).resolves.toEqual([{
    sourcePlayerId: 400,
    fullName: "Victor Wembanyama",
    nbaPlayerId: null
  }]);
});

it("updates only matched NBA ids and preserves unmatched rows", async () => {
  const db = createDbClient([[{ updated_players: 1 }]]);
  await expect(updateRosterNbaPlayerIds(db, [
    { sourcePlayerId: 400, nbaPlayerId: 1641705 }
  ])).resolves.toEqual({ updatedPlayers: 1 });
  expect(db.query).toHaveBeenCalledWith(
    expect.stringContaining("SET nba_player_id = input.nba_player_id"),
    [JSON.stringify([{ sourcePlayerId: 400, nbaPlayerId: 1641705 }])]
  );
});
```

- [ ] **Step 2: Run persistence tests and verify RED**

Run: `pnpm test -- src/lib/nba2k-roster-db.test.ts`

Expected: FAIL because the column and functions do not exist.

- [ ] **Step 3: Implement schema migration and persistence functions**

After table creation run:

```sql
ALTER TABLE nba2k_roster_players
ADD COLUMN IF NOT EXISTS nba_player_id bigint
```

Select `nba_player_id` in roster summaries and identities. Implement `updateRosterNbaPlayerIds` as one `jsonb_to_recordset` update keyed by `game_version = 'nba2k26'`, `source = 'nba2klab'`, and `source_player_id`. Return early with `{ updatedPlayers: 0 }` for no matches.

- [ ] **Step 4: Run persistence tests and verify GREEN**

Run: `pnpm test -- src/lib/nba2k-roster-db.test.ts`

Expected: schema, summary mapping, draft-class fallback, identity loading, and update tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/nba2k-roster-db.ts src/lib/nba2k-roster-db.test.ts
git commit -m "feat: persist NBA player media ids"
```

### Task 3: Synchronize and backfill NBA media IDs

**Files:**
- Create: `src/lib/nba-player-media-sync.ts`
- Create: `src/lib/nba-player-media-sync.test.ts`
- Create: `scripts/sync-nba-player-ids.ts`
- Modify: `scripts/sync-nba2k26-rosters.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 1 directory functions and Task 2 persistence functions.
- Produces: `syncNbaPlayerIds(db, options)` returning `{ directoryPlayers, matchedPlayers, unmatchedPlayers, updatedPlayers, error? }` and script `pnpm sync:nba-player-ids`.

- [ ] **Step 1: Write failing synchronization tests**

```ts
it("matches roster names and updates their NBA ids", async () => {
  vi.mocked(loadRosterPlayerIdentities).mockResolvedValue([
    { sourcePlayerId: 400, fullName: "Victor Wembanyama", nbaPlayerId: null },
    { sourcePlayerId: -2026001, fullName: "AJ Dybantsa", nbaPlayerId: null }
  ]);
  vi.mocked(fetchNbaPlayerDirectory).mockResolvedValue([
    { nbaPlayerId: 1641705, fullName: "Victor Wembanyama" }
  ]);
  vi.mocked(updateRosterNbaPlayerIds).mockResolvedValue({ updatedPlayers: 1 });

  await expect(syncNbaPlayerIds(db)).resolves.toEqual({
    directoryPlayers: 1,
    matchedPlayers: 1,
    unmatchedPlayers: 1,
    updatedPlayers: 1
  });
});

it("retains existing ids and reports an NBA directory failure", async () => {
  vi.mocked(fetchNbaPlayerDirectory).mockRejectedValue(new Error("NBA unavailable"));
  await expect(syncNbaPlayerIds(db)).resolves.toEqual({
    directoryPlayers: 0,
    matchedPlayers: 0,
    unmatchedPlayers: 0,
    updatedPlayers: 0,
    error: "NBA unavailable"
  });
  expect(updateRosterNbaPlayerIds).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run sync tests and verify RED**

Run: `pnpm test -- src/lib/nba-player-media-sync.test.ts`

Expected: FAIL because the sync module does not exist.

- [ ] **Step 3: Implement non-destructive synchronization and commands**

`syncNbaPlayerIds` loads identities, fetches the directory, indexes normalized names, and sends only matched `{ sourcePlayerId, nbaPlayerId }` pairs to the update function. On fetch/parse error it returns the error string and never updates the DB.

Create `scripts/sync-nba-player-ids.ts` using the existing `.env` loading and Postgres adapter pattern from `sync-nba2k26-rosters.ts`. Add:

```json
"sync:nba-player-ids": "node --no-warnings --experimental-strip-types scripts/sync-nba-player-ids.ts"
```

After the existing roster upsert, call `syncNbaPlayerIds(db)` and include its result as `nbaMedia` in `syncNba2k26Rosters` output. A returned `error` does not fail the roster import.

- [ ] **Step 4: Run sync tests and verify GREEN**

Run: `pnpm test -- src/lib/nba-player-media-sync.test.ts`

Expected: matching and non-destructive failure tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/nba-player-media-sync.ts src/lib/nba-player-media-sync.test.ts scripts/sync-nba-player-ids.ts scripts/sync-nba2k26-rosters.ts package.json
git commit -m "feat: sync NBA player media ids"
```

### Task 4: Construct NBA media URLs and fallback asset

**Files:**
- Create: `src/lib/nba-media.ts`
- Create: `src/lib/nba-media.test.ts`
- Create: `public/images/player-silhouette.svg`

**Interfaces:**
- Produces: `getNbaTeamLogoUrl`, `getNbaPlayerHeadshotUrl`, and `getPlayerPortraitUrl`.
- Consumed by: notification and recap routes in Task 6.

- [ ] **Step 1: Write failing URL tests**

```ts
expect(getNbaTeamLogoUrl(1610612759)).toBe(
  "https://cdn.nba.com/logos/nba/1610612759/primary/L/logo.svg"
);
expect(getNbaPlayerHeadshotUrl(1641705)).toBe(
  "https://cdn.nba.com/headshots/nba/latest/1040x760/1641705.png"
);
expect(getPlayerPortraitUrl(null, "https://draft.nba2kfl.fr")).toBe(
  "https://draft.nba2kfl.fr/images/player-silhouette.svg"
);
expect(getPlayerPortraitUrl(null, "http://localhost:3000")).toBeNull();
```

- [ ] **Step 2: Run media tests and verify RED**

Run: `pnpm test -- src/lib/nba-media.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement deterministic URL helpers and original silhouette**

Accept only positive integer IDs. `getPlayerPortraitUrl` returns the NBA headshot when an ID exists; otherwise parse the application URL and require protocol `https:` before resolving `/images/player-silhouette.svg`.

Create an original SVG containing a neutral head-and-shoulders silhouette, dark command-surface background, and gold NBA2KFL accent ring. Do not include NBA marks or text.

- [ ] **Step 4: Run media tests and verify GREEN**

Run: `pnpm test -- src/lib/nba-media.test.ts`

Expected: official URL and fallback tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/nba-media.ts src/lib/nba-media.test.ts public/images/player-silhouette.svg
git commit -m "feat: add NBA webhook media URLs"
```

### Task 5: Render compact Discord pick cards

**Files:**
- Modify: `src/lib/discord-webhook.ts`
- Modify: `src/lib/discord-webhook.test.ts`

**Interfaces:**
- Consumes: server-resolved `teamLogoUrl` and `playerPortraitUrl` fields.
- Produces: compact individual and recap embeds with no more than ten embeds per payload.

- [ ] **Step 1: Replace recap-summary tests with failing compact-card tests**

Extend both item types with `teamLogoUrl: string | null` and `playerPortraitUrl: string | null`. Assert an individual embed includes:

```ts
{
  author: {
    name: "San Antonio Spurs",
    icon_url: "https://cdn.nba.com/logos/nba/1610612759/primary/L/logo.svg"
  },
  color: 0xf5b335,
  description: "**Chris** sélectionne\n➡️ **Victor Wembanyama**",
  footer: { text: "NBA2KFL · Pick #7" },
  thumbnail: {
    url: "https://cdn.nba.com/headshots/nba/latest/1040x760/1641705.png"
  },
  timestamp: "2026-07-10T10:00:00.000Z",
  title: "🏀 PICK VALIDÉ · T1.7"
}
```

Create 17 recap items and assert two payloads with 10 and 7 embeds, ordered titles, disabled mentions, media fields present when non-null, and omitted `author.icon_url`/`thumbnail` when URLs are null.

- [ ] **Step 2: Run formatter tests and verify RED**

Run: `pnpm test -- src/lib/discord-webhook.test.ts`

Expected: FAIL because the formatter still creates one text-summary embed.

- [ ] **Step 3: Implement one compact embed per pick**

Expand the internal `DiscordEmbed` type with optional `author` and `thumbnail`. Reuse one `createPickEmbed` helper for individual and recap formatting. Chunk sorted recap items with `slice(index, index + 10)` and return one payload per chunk. Preserve `allowed_mentions: { parse: [] }`.

- [ ] **Step 4: Run formatter tests and verify GREEN**

Run: `pnpm test -- src/lib/discord-webhook.test.ts`

Expected: individual media, missing-media fallback, order, and 10-embed chunk tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/discord-webhook.ts src/lib/discord-webhook.test.ts
git commit -m "feat: render compact NBA Discord cards"
```

### Task 6: Resolve media server-side in notification routes

**Files:**
- Modify: `app/_components/RedraftRoom.tsx`
- Modify: `app/_components/RedraftRoom.test.tsx`
- Modify: `app/api/redraft-picks/notifications/route.ts`
- Modify: `app/api/redraft-picks/notifications/route.test.ts`
- Modify: `src/lib/redraft-picks.ts`
- Modify: `src/lib/redraft-picks.test.ts`
- Modify: `app/api/redraft-picks/notifications/recap/route.ts`
- Modify: `app/api/redraft-picks/notifications/recap/route.test.ts`

**Interfaces:**
- Consumes: Task 2 `nbaPlayerId`, Task 4 URL helpers, Task 5 media-aware formatter.
- Produces: server-resolved media for individual and recap webhooks.

- [ ] **Step 1: Write failing persistence and route tests**

For recap persistence, return `nba_player_id` through a left join and assert `nbaPlayerId` mapping. For the individual client request, add `playerSourceId` and `teamId` to the expected JSON body.

In the notification route test, mock DB and roster lookup, then assert the formatter receives official URLs derived from canonical IDs—not client URLs. Add a missing-NBA-ID test that uses the HTTPS fallback.

In the recap route test, return rows with one NBA ID and one null ID, then assert the generated payloads receive one official headshot and one fallback portrait plus canonical team-logo URLs.

- [ ] **Step 2: Run route and persistence tests and verify RED**

Run:

```bash
pnpm test -- src/lib/redraft-picks.test.ts app/_components/RedraftRoom.test.tsx app/api/redraft-picks/notifications/route.test.ts app/api/redraft-picks/notifications/recap/route.test.ts
```

Expected: FAIL because media identifiers are not carried through the data flow.

- [ ] **Step 3: Implement server-side media resolution**

Add `loadRosterPlayerMedia(db, sourcePlayerId)` returning `{ nbaPlayerId: number | null } | null`. Validate positive or supported negative integer `playerSourceId` and canonical `teamId` in the notification payload. The route obtains `getDraftDbClient()`, runs `ensureNba2kRosterSchema`, loads media, resolves the canonical team, and calls the formatter with:

```ts
{
  ...notification,
  teamName: team?.name ?? notification.teamName,
  teamLogoUrl: team ? getNbaTeamLogoUrl(team.nbaTeamId) : null,
  playerPortraitUrl: getPlayerPortraitUrl(
    playerMedia?.nbaPlayerId ?? null,
    process.env.BETTER_AUTH_URL
  )
}
```

Update the recap query to left-join current `nba2k_roster_players` by `roster_source_player_id`, `game_version = 'nba2k26'`, and `source = 'nba2klab'`. Map media URLs in the recap route. Do not change webhook authentication behavior in this task.

- [ ] **Step 4: Run route and persistence tests and verify GREEN**

Run the same command from Step 2.

Expected: client payload, DB lookup, canonical team media, official portrait, fallback, and recap media tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/_components/RedraftRoom.tsx app/_components/RedraftRoom.test.tsx app/api/redraft-picks/notifications/route.ts app/api/redraft-picks/notifications/route.test.ts src/lib/redraft-picks.ts src/lib/redraft-picks.test.ts app/api/redraft-picks/notifications/recap/route.ts app/api/redraft-picks/notifications/recap/route.test.ts
git commit -m "feat: resolve NBA webhook media server-side"
```

### Task 7: Verify, backfill, and send the visual recap

**Files:**
- No source changes expected.

**Interfaces:**
- Consumes: configured `DATABASE_URL`, `NBA_STATS_SEASON`, `BETTER_AUTH_URL`, and `DISCORD_DRAFT_WEBHOOK_URL`.
- Produces: synchronized NBA IDs and one new visual recap send.

- [ ] **Step 1: Run full verification**

Run `pnpm test`, then `pnpm build`, then `git diff --check`.

Expected: all tests pass, Next.js build exits 0, and diff check has no output.

- [ ] **Step 2: Backfill current roster IDs**

Run: `pnpm sync:nba-player-ids`

Expected JSON fields: `directoryPlayers`, `matchedPlayers`, `unmatchedPlayers`, and `updatedPlayers`. The command must not modify `redraft_picks`.

- [ ] **Step 3: Verify current pick media coverage read-only**

Run a read-only joined query over `redraft_picks` and `nba2k_roster_players`. Print only `{ pickCount, officialPortraits, fallbacks }`, never connection strings or webhook URLs.

- [ ] **Step 4: Send one visual recap batch**

Use the tested recap formatter and sender with the read-only joined rows. Send exactly one invocation of `sendDiscordWebhookPayloads`; it may issue multiple Discord requests due to the ten-embed limit. Print `{ pickCount, messageCount, officialPortraits, fallbacks, status: "sent" }`.

- [ ] **Step 5: Report evidence**

Report exact test totals, build result, NBA directory/match counts, official/fallback portrait counts, and Discord message count. Do not claim that Discord rendered an image successfully solely from a `204`; report only webhook acceptance.
