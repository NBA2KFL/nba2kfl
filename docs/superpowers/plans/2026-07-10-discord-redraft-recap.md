# Discord Redraft Recap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-only redraft-page action that sends a polished Discord recap of every persisted pick, style individual pick notifications consistently, and send the first real recap after verification.

**Architecture:** Keep persistence mapping in `src/lib/redraft-picks.ts`, pure Discord payload formatting and delivery in `src/lib/discord-webhook.ts`, authorization/orchestration in a dedicated recap route, and UI state in `RedraftRoom`. The route reads official database rows, resolves canonical GM/team names, chunks embeds below Discord limits, and returns pick/message counts.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Neon serverless Postgres, Vitest 4, Discord incoming webhooks.

## Global Constraints

- Only administrators can trigger a recap; authorization must be enforced server-side.
- Recaps are read-only and must not alter draft state.
- Use rich embeds with an NBA2KFL red/gold accent, French copy, footer, timestamp, and disabled mentions.
- Preserve pick order and split messages below Discord's 6,000-character combined embed limit.
- Do not add dependencies, schedules, history tables, configuration UI, bots, or interactive Discord components.
- Follow red-green-refactor for every behavior change.

---

### Task 1: Load persisted recap rows

**Files:**
- Modify: `src/lib/redraft-picks.ts`
- Test: `src/lib/redraft-picks.test.ts`

**Interfaces:**
- Produces: `RedraftPickRecapRow` and `loadRedraftPickRecap(db): Promise<RedraftPickRecapRow[]>`.
- Consumed later by: the recap API route.

- [ ] **Step 1: Write the failing persistence test**

Add `loadRedraftPickRecap` to the imports and a test whose mocked DB returns snake_case values:

```ts
it("loads ordered redraft recap details", async () => {
  const validatedAt = "2026-07-10T10:00:00.000Z";
  const db = createDbClient([[{
    pick_number: 7,
    round: 1,
    round_pick: 7,
    slot: 7,
    franchise_team_id: "sas",
    player_name: "Victor Wembanyama",
    updated_at: validatedAt
  }]]);

  await expect(loadRedraftPickRecap(db)).resolves.toEqual([{
    pickNumber: 7,
    round: 1,
    roundPick: 7,
    slot: 7,
    franchiseTeamId: "sas",
    playerName: "Victor Wembanyama",
    validatedAt
  }]);
  expect(db.query).toHaveBeenCalledWith(expect.stringContaining("ORDER BY pick_number"));
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `pnpm test -- src/lib/redraft-picks.test.ts`

Expected: FAIL because `loadRedraftPickRecap` is not exported.

- [ ] **Step 3: Implement the recap query and mapping**

Add:

```ts
type RedraftPickRecapDbRow = {
  pick_number: number | string;
  round: number | string;
  round_pick: number | string;
  slot: number | string;
  franchise_team_id: string;
  player_name: string;
  updated_at: Date | string;
};

export type RedraftPickRecapRow = {
  pickNumber: number;
  round: number;
  roundPick: number;
  slot: number;
  franchiseTeamId: string;
  playerName: string;
  validatedAt: Date | string;
};

export async function loadRedraftPickRecap(db: DraftDbClient) {
  const rows = await db.query<RedraftPickRecapDbRow>(`
    SELECT pick_number, round, round_pick, slot,
      franchise_team_id, player_name, updated_at
    FROM redraft_picks
    ORDER BY pick_number
  `);

  return rows.map((row) => ({
    pickNumber: Number(row.pick_number),
    round: Number(row.round),
    roundPick: Number(row.round_pick),
    slot: Number(row.slot),
    franchiseTeamId: row.franchise_team_id,
    playerName: row.player_name,
    validatedAt: row.updated_at
  }));
}
```

- [ ] **Step 4: Run the test and verify GREEN**

Run: `pnpm test -- src/lib/redraft-picks.test.ts`

Expected: recap mapping test and existing persistence tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/redraft-picks.ts src/lib/redraft-picks.test.ts
git commit -m "feat: load redraft recap rows"
```

### Task 2: Build styled Discord payloads

**Files:**
- Modify: `src/lib/discord-webhook.ts`
- Test: `src/lib/discord-webhook.test.ts`

**Interfaces:**
- Consumes: resolved recap items supplied by the route.
- Produces: `RedraftRecapItem`, `createRedraftPickDiscordPayload`, `createRedraftRecapDiscordPayloads`, and `sendDiscordWebhookPayloads`.

- [ ] **Step 1: Write failing styled-payload tests**

Replace plain-content assertions with assertions for this individual payload shape:

```ts
expect(createRedraftPickDiscordPayload(notification, "2026-07-10T10:00:00.000Z"))
  .toEqual({
    allowed_mentions: { parse: [] },
    embeds: [{
      color: 0xf5b335,
      description: "**Chris** · San Antonio Spurs\n➡️ **Victor Wembanyama**",
      footer: { text: "NBA2KFL · Pick #7" },
      timestamp: "2026-07-10T10:00:00.000Z",
      title: "🏀 PICK VALIDÉ · T1.7"
    }]
  });
```

Add a recap test using three picks across two rounds and assert the first embed has title `🏀 RÉCAP REDRAFT NBA2KFL`, descriptions grouped under `**TOUR 1**` and `**TOUR 2**`, footer `3 picks validés · NBA2KFL`, and disabled mentions. Add a limit test with long player/GM/team names and enough items to assert more than one payload, ordered unique pick lines, and serialized embed text below 6,000 characters per payload.

- [ ] **Step 2: Run formatter tests and verify RED**

Run: `pnpm test -- src/lib/discord-webhook.test.ts`

Expected: FAIL because the new payload functions do not exist.

- [ ] **Step 3: Implement typed payload construction and chunking**

Introduce minimal Discord payload types, constants `NBA2KFL_GOLD = 0xf5b335` and `DISCORD_EMBED_TEXT_LIMIT = 5800`, and these signatures:

```ts
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
  embeds: Array<{
    color: number;
    title: string;
    description: string;
    footer: { text: string };
    timestamp: string;
  }>;
};

export function createRedraftPickDiscordPayload(
  notification: RedraftPickDiscordNotification,
  timestamp = new Date().toISOString()
): DiscordWebhookPayload;

export function createRedraftRecapDiscordPayloads(
  items: readonly RedraftRecapItem[],
  timestamp = new Date().toISOString()
): DiscordWebhookPayload[];

export async function sendDiscordWebhookPayloads(
  webhookUrl: string,
  payloads: readonly DiscordWebhookPayload[],
  fetcher: WebhookFetch = fetch
): Promise<void>;
```

Build recap descriptions incrementally. Start a new chunk before appending a round heading or pick line that would push title + description + footer above `DISCORD_EMBED_TEXT_LIMIT`. Preserve every line exactly once. Keep `sendRedraftPickDiscordNotification` as a compatibility wrapper that calls `sendDiscordWebhookPayloads` with the styled individual payload.

- [ ] **Step 4: Run formatter tests and verify GREEN**

Run: `pnpm test -- src/lib/discord-webhook.test.ts`

Expected: styled individual, recap grouping, chunking, delivery, and rejection tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/discord-webhook.ts src/lib/discord-webhook.test.ts
git commit -m "feat: style Discord draft notifications"
```

### Task 3: Add the protected recap endpoint

**Files:**
- Create: `app/api/redraft-picks/notifications/recap/route.ts`
- Create: `app/api/redraft-picks/notifications/recap/route.test.ts`

**Interfaces:**
- Consumes: `requireAdminEmail`, `loadRedraftPickRecap`, canonical `NBA_TEAMS` and `GM_DRAFT_SLOT_LINKS`, `createRedraftRecapDiscordPayloads`, and `sendDiscordWebhookPayloads`.
- Produces: `POST(): Promise<Response>` returning `{ pickCount: number; messageCount: number }`.

- [ ] **Step 1: Write failing route tests**

Mock `next/headers`, auth, DB, persistence, and Discord delivery. Cover:

```ts
it("sends all persisted picks for an admin", async () => {
  process.env.ADMIN_EMAILS = "admin@nba2kfl.local";
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user: { email: "admin@nba2kfl.local" }
  });
  vi.mocked(loadRedraftPickRecap).mockResolvedValue([{
    pickNumber: 7, round: 1, roundPick: 7, slot: 7,
    franchiseTeamId: "sas", playerName: "Victor Wembanyama",
    validatedAt: "2026-07-10T10:00:00.000Z"
  }]);

  const response = await POST();

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ pickCount: 1, messageCount: 1 });
  expect(sendDiscordWebhookPayloads).toHaveBeenCalledOnce();
});
```

Also assert `401` without session, `403` for a non-admin, `409` for zero rows, `503` without `DISCORD_DRAFT_WEBHOOK_URL`, `502` when Discord delivery throws, and `500` when the DB loader throws. In all rejected authorization/empty/config cases, assert the sender is not called.

- [ ] **Step 2: Run route tests and verify RED**

Run: `pnpm test -- app/api/redraft-picks/notifications/recap/route.test.ts`

Expected: FAIL because the recap route does not exist.

- [ ] **Step 3: Implement authorization, mapping, delivery, and responses**

The route must authenticate first:

```ts
const session = await auth.api.getSession({ headers: await headers() });
requireAdminEmail(session);
```

Then load rows using `getDraftDbClient`, map GM names by slot and team names by ID with fallbacks `GM #${slot}` and `Franchise ${franchiseTeamId.toUpperCase()}`, construct payloads, send them, and return:

```ts
return NextResponse.json({
  pickCount: rows.length,
  messageCount: payloads.length
});
```

Use French responses: `Connexion requise.`, `Acces admin requis.`, `Aucun pick valide a recapitulé.`, `Webhook Discord non configure.`, `Notification Discord indisponible.`, and `La base de donnees redraft est indisponible.`. Never log or return the webhook URL.

- [ ] **Step 4: Run route tests and verify GREEN**

Run: `pnpm test -- app/api/redraft-picks/notifications/recap/route.test.ts`

Expected: all recap route cases PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/redraft-picks/notifications/recap
git commit -m "feat: add admin Discord recap endpoint"
```

### Task 4: Add the visible admin recap action

**Files:**
- Modify: `app/_components/RedraftRoom.tsx`
- Modify: `app/_components/RedraftRoom.test.tsx`

**Interfaces:**
- Consumes: `POST /api/redraft-picks/notifications/recap` returning `{ pickCount, messageCount }` or `{ error }`.
- Produces: exported `requestRedraftRecap()` helper and admin-only button behavior.

- [ ] **Step 1: Write failing request-helper tests**

Add:

```ts
it("requests an admin Discord recap", async () => {
  const fetchMock = vi.fn(async () => Response.json({
    pickCount: 7,
    messageCount: 1
  }));
  vi.stubGlobal("fetch", fetchMock);

  await expect(requestRedraftRecap()).resolves.toEqual({
    pickCount: 7,
    messageCount: 1
  });
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/redraft-picks/notifications/recap",
    { method: "POST" }
  );
});

it("surfaces recap API errors", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(
    { error: "Acces admin requis." },
    { status: 403 }
  )));
  await expect(requestRedraftRecap()).rejects.toThrow("Acces admin requis.");
});
```

- [ ] **Step 2: Run component tests and verify RED**

Run: `pnpm test -- app/_components/RedraftRoom.test.tsx`

Expected: FAIL because `requestRedraftRecap` is not exported.

- [ ] **Step 3: Implement the helper and UI state**

Add `isSendingRecap` and `recapStatus` state. Implement:

```ts
export async function requestRedraftRecap() {
  const response = await fetch("/api/redraft-picks/notifications/recap", {
    method: "POST"
  });
  const payload = await response.json().catch(() => ({})) as {
    pickCount?: number;
    messageCount?: number;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error ?? "Impossible d'envoyer le récap Discord.");
  }
  if (typeof payload.pickCount !== "number" ||
      typeof payload.messageCount !== "number") {
    throw new Error("Réponse récap Discord invalide.");
  }
  return { pickCount: payload.pickCount, messageCount: payload.messageCount };
}
```

Render the button only when `isAdmin`, disable it while sending, label it `Envoi du récap…` during the request, and show `Récap Discord envoyé · N picks` on success or the caught error in an accessible `role="status"`/`role="alert"` region. Keep the existing clear and franchise actions unchanged.

- [ ] **Step 4: Run component tests and verify GREEN**

Run: `pnpm test -- app/_components/RedraftRoom.test.tsx`

Expected: request success/error tests and all existing component tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/_components/RedraftRoom.tsx app/_components/RedraftRoom.test.tsx
git commit -m "feat: add admin Discord recap action"
```

### Task 5: Verify and send the first recap

**Files:**
- No source changes expected.

**Interfaces:**
- Consumes: the tested formatter and configured `DATABASE_URL` / `DISCORD_DRAFT_WEBHOOK_URL`.
- Produces: one live recap send and reported pick/message counts.

- [ ] **Step 1: Run full automated verification**

Run: `pnpm test`

Expected: all test files PASS with zero failures.

Run: `pnpm build`

Expected: Next.js production build and TypeScript checks exit 0.

Run: `git diff --check`

Expected: no output and exit 0.

- [ ] **Step 2: Read the live recap rows without mutation**

Use Node with `.env` and Neon to execute only:

```sql
SELECT pick_number, round, round_pick, slot,
  franchise_team_id, player_name, updated_at
FROM redraft_picks
ORDER BY pick_number
```

Print only the row count, never the database URL.

- [ ] **Step 3: Send exactly one recap batch**

Use Node's TypeScript stripping to import `createRedraftRecapDiscordPayloads` and `sendDiscordWebhookPayloads`, map rows to canonical GM/team display names, send the returned payload array once, and print `{ pickCount, messageCount, status: "sent" }`. Do not insert or update rows and do not print the webhook URL.

- [ ] **Step 4: Report verification and live-send evidence**

Report the exact passing test count, build exit status, recap pick count, and Discord message count. If there are zero picks, do not send an empty message; report that condition instead.
