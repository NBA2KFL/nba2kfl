# Automatic End-of-Round Discord Recap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically send one idempotent plain-text Discord recap containing only the picks from each completed redraft round.

**Architecture:** Add a pure text formatter and sender alongside the existing visual embed sender. Persist one `pending`/`sent` claim per round, then let the authenticated pick PATCH route claim completed rounds, send their text recap, and mark successful delivery without rolling back picks.

**Tech Stack:** Next.js 16 App Router, TypeScript 5.9, Neon Postgres, Discord webhooks, Vitest 4.

## Global Constraints

- Automatic messages contain no logos, portraits, thumbnails, or embed cards.
- Each automatic message contains only the completed round's picks.
- Clearing a pick never sends a recap.
- Updating an already selected pick never sends a second recap.
- Repeated PATCH requests cannot duplicate a claimed round.
- Pick persistence succeeds even when Discord delivery fails.
- Webhook URLs remain server-only and mentions remain disabled.
- No scheduled jobs, queues, or changes to ownership/validation rules.

---

### Task 1: Add the plain-text round formatter and sender

**Files:**
- Modify: `src/lib/discord-webhook.ts`
- Modify: `src/lib/discord-webhook.test.ts`

**Interfaces:**
- Produces: `RedraftRoundRecapItem`, `formatRedraftRoundRecapContent`, and `sendRedraftRoundRecap`.
- Consumed by the round-dispatch service in Task 3.

- [ ] **Step 1: Write failing formatter/sender tests**

```ts
import {
  formatRedraftRoundRecapContent,
  sendRedraftRoundRecap
} from "./discord-webhook";

it("formats only the completed round as plain text", () => {
  expect(formatRedraftRoundRecapContent(1, [
    { pickNumber: 1, gmName: "Anna", playerName: "Victor Wembanyama" },
    { pickNumber: 2, gmName: "Elias", playerName: "Shai Gilgeous-Alexander" }
  ])).toBe([
    "🏁 TOUR 1 TERMINÉ",
    "",
    "#1 · Anna · Victor Wembanyama",
    "#2 · Elias · Shai Gilgeous-Alexander"
  ].join("\\n"));
});

it("chunks plain content at the Discord 2,000-character limit", () => {
  const messages = formatRedraftRoundRecapContent(
    2,
    Array.from({ length: 100 }, (_, index) => ({
      pickNumber: index + 31,
      gmName: `GM ${index}`,
      playerName: `Player ${"X".repeat(30)}`
    }))
  );
  expect(Array.isArray(messages)).toBe(true);
  expect((messages as string[]).every((message) => message.length <= 2000)).toBe(true);
});

it("sends plain content with mentions disabled", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  await sendRedraftRoundRecap("https://discord.example/webhook", "🏁 TOUR 1 TERMINÉ", fetcher);
  expect(fetcher).toHaveBeenCalledWith("https://discord.example/webhook", {
    body: JSON.stringify({
      allowed_mentions: { parse: [] },
      content: "🏁 TOUR 1 TERMINÉ"
    }),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
});
```

- [ ] **Step 2: Run formatter tests and verify RED**

Run: `pnpm test -- src/lib/discord-webhook.test.ts`

Expected: FAIL because the text formatter and sender are not exported.

- [ ] **Step 3: Implement the minimal plain-text functions**

Add:

```ts
export type RedraftRoundRecapItem = {
  pickNumber: number;
  gmName: string;
  playerName: string;
};

export function formatRedraftRoundRecapContent(
  round: number,
  items: readonly RedraftRoundRecapItem[]
): string[] {
  const lines = [
    `🏁 TOUR ${round} TERMINÉ`,
    "",
    ...items.map((item) => `#${item.pickNumber} · ${item.gmName} · ${item.playerName}`)
  ];
  const messages: string[] = [];
  let current = "";
  for (const line of lines) {
    const candidate = current ? `${current}\\n${line}` : line;
    if (current && candidate.length > 2000) {
      messages.push(current);
      current = line;
    } else {
      current = candidate;
    }
  }
  if (current) messages.push(current);
  return messages;
}
```

`sendRedraftRoundRecap` accepts one already-chunked string and posts `{ content, allowed_mentions: { parse: [] } }`, throwing the existing Discord delivery error on non-2xx responses.

- [ ] **Step 4: Run formatter tests and verify GREEN**

Run: `pnpm test -- src/lib/discord-webhook.test.ts`

Expected: all existing visual tests plus new plain-text tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/discord-webhook.ts src/lib/discord-webhook.test.ts
git commit -m "feat: format automatic round recaps"
```

### Task 2: Add idempotent round claims

**Files:**
- Create: `src/lib/redraft-round-recaps.ts`
- Create: `src/lib/redraft-round-recaps.test.ts`

**Interfaces:**
- Produces: `ensureRedraftRoundRecapSchema`, `claimRedraftRoundRecap`, `markRedraftRoundRecapSent`, and `loadPendingRedraftRounds`.
- Consumed by the PATCH dispatch logic in Task 4.

- [ ] **Step 1: Write failing schema/claim tests**

```ts
it("creates the idempotency table", async () => {
  const db = createDbClient();
  await ensureRedraftRoundRecapSchema(db);
  expect(db.query).toHaveBeenCalledWith(
    expect.stringContaining("CREATE TABLE IF NOT EXISTS redraft_round_recaps")
  );
});

it("returns true only when a round is claimed for the first time", async () => {
  const firstDb = createDbClient([[{ round: 1 }]]);
  const duplicateDb = createDbClient([[]]);
  await expect(claimRedraftRoundRecap(firstDb, 1)).resolves.toBe(true);
  await expect(claimRedraftRoundRecap(duplicateDb, 1)).resolves.toBe(false);
});

it("marks a claimed recap sent and loads pending rounds", async () => {
  const db = createDbClient([[{ round: 2 }]]);
  await markRedraftRoundRecapSent(db, 2);
  await expect(loadPendingRedraftRounds(db)).resolves.toEqual([2]);
  expect(db.query).toHaveBeenCalledWith(expect.stringContaining("status = 'pending'"));
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm test -- src/lib/redraft-round-recaps.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement schema and idempotent SQL**

Use the schema from the approved spec. `claimRedraftRoundRecap` runs `INSERT INTO ... status = 'pending' ON CONFLICT (round) DO NOTHING RETURNING round` and returns whether a row was inserted. `markRedraftRoundRecapSent` updates `status = 'sent', sent_at = now()`. `loadPendingRedraftRounds` selects ordered pending rounds.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `pnpm test -- src/lib/redraft-round-recaps.test.ts`

Expected: schema, first-claim, duplicate-claim, mark, and pending tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/redraft-round-recaps.ts src/lib/redraft-round-recaps.test.ts
git commit -m "feat: claim automatic round recaps idempotently"
```

### Task 3: Detect completed rounds and build dispatch service

**Files:**
- Create: `src/lib/automatic-round-recap.ts`
- Create: `src/lib/automatic-round-recap.test.ts`
- Modify: `src/lib/redraft-picks.ts`
- Modify: `src/lib/redraft-picks.test.ts`

**Interfaces:**
- Consumes: canonical `SnakeDraftPick[]`, persisted recap rows, Task 1 formatter, and Task 2 claims.
- Produces: `getCompletedRedraftRounds`, `loadRedraftRoundRecapItems`, and `dispatchAutomaticRoundRecaps`.

- [ ] **Step 1: Write failing completion/dispatch tests**

Cover these independent cases:

```ts
it("recognizes a round only when every pick in that round is selected", () => {
  const picks = [
    { pickNumber: 1, round: 1 },
    { pickNumber: 2, round: 1 },
    { pickNumber: 3, round: 2 }
  ] as SnakeDraftPick[];
  expect(getCompletedRedraftRounds(picks, { 1: "A" })).toEqual([]);
  expect(getCompletedRedraftRounds(picks, { 1: "A", 2: "B" })).toEqual([1]);
});

it("claims and sends each completed round once", async () => {
  vi.mocked(claimRedraftRoundRecap)
    .mockResolvedValueOnce(true)
    .mockResolvedValueOnce(false);
  await dispatchAutomaticRoundRecaps(db, draftPicks, { 1: "A", 2: "B" });
  await dispatchAutomaticRoundRecaps(db, draftPicks, { 1: "A", 2: "B" });
  expect(sendRedraftRoundRecap).toHaveBeenCalledTimes(1);
});

it("leaves a pending claim after Discord failure and keeps the pick result", async () => {
  vi.mocked(sendRedraftRoundRecap).mockRejectedValue(new Error("Discord down"));
  await expect(
    dispatchAutomaticRoundRecaps(db, draftPicks, { 1: "A", 2: "B" })
  ).resolves.toEqual({ sentRounds: [], failedRounds: [1] });
  expect(markRedraftRoundRecapSent).not.toHaveBeenCalled();
});
```

Add `loadRedraftRoundRecapItems(db, round)` to select `pick_number`, `slot`, and `player_name` for one round, ordered by pick number, and map GM names in the dispatch service from `GM_DRAFT_SLOT_LINKS`.

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm test -- src/lib/automatic-round-recap.test.ts src/lib/redraft-picks.test.ts`

Expected: FAIL because completion and dispatch functions do not exist.

- [ ] **Step 3: Implement pure completion detection and non-throwing dispatch**

`getCompletedRedraftRounds` groups canonical draft picks by round and returns rounds where every pick number maps to a non-empty persisted player. `dispatchAutomaticRoundRecaps`:

1. loads pending rounds and retries them;
2. claims newly completed rounds;
3. loads only each claimed round’s rows;
4. formats plain text and sends every chunk;
5. marks sent only after all chunks succeed;
6. catches/logs delivery failures and returns `{ sentRounds, failedRounds }` without throwing.

The service must not call the visual embed formatter.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `pnpm test -- src/lib/automatic-round-recap.test.ts src/lib/redraft-picks.test.ts`

Expected: completion, order, retry, duplicate, failure, and persistence mapping tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/automatic-round-recap.ts src/lib/automatic-round-recap.test.ts src/lib/redraft-picks.ts src/lib/redraft-picks.test.ts
git commit -m "feat: dispatch completed round recaps"
```

### Task 4: Integrate automatic dispatch after pick persistence

**Files:**
- Modify: `app/api/redraft-picks/route.ts`
- Modify: `app/api/redraft-picks/route.test.ts`

**Interfaces:**
- Consumes: Task 2 schema/claims and Task 3 dispatch service.
- Produces: automatic text recap side effect after successful PATCH persistence.

- [ ] **Step 1: Write failing route integration tests**

Mock `ensureRedraftRoundRecapSchema` and `dispatchAutomaticRoundRecaps`. Assert:

```ts
it("dispatches completed round recaps after a selected pick is persisted", async () => {
  vi.mocked(dispatchAutomaticRoundRecaps).mockResolvedValue({
    sentRounds: [1],
    failedRounds: []
  });
  const response = await PATCH(new Request("http://localhost/api/redraft-picks", {
    method: "PATCH",
    body: JSON.stringify({ pickNumber: 2, playerName: "B" }),
  }));
  expect(response.status).toBe(200);
  expect(ensureRedraftRoundRecapSchema).toHaveBeenCalledWith(db);
  expect(dispatchAutomaticRoundRecaps).toHaveBeenCalledWith(
    db,
    expect.any(Array),
    expect.any(Object)
  );
});

it("does not dispatch after clearing a pick", async () => {
  await DELETE();
  expect(dispatchAutomaticRoundRecaps).not.toHaveBeenCalled();
});
```

Assert a dispatcher failure does not change the successful `{ picks }` response.

- [ ] **Step 2: Run route tests and verify RED**

Run: `pnpm test -- app/api/redraft-picks/route.test.ts`

Expected: FAIL because the route does not prepare or invoke the automatic recap service.

- [ ] **Step 3: Integrate schema preparation and dispatch**

Call `ensureRedraftRoundRecapSchema(db)` in `prepareRedraftPickDb`. After `insertDraftEvent` in the successful PATCH path, call `dispatchAutomaticRoundRecaps(db, state.draftPicks, { ...state.picks, [pick.pickNumber]: validation.playerName })`. Do not call it from DELETE or from invalid/unauthorized branches. Return the existing picks response regardless of recap delivery outcome.

- [ ] **Step 4: Run route tests and verify GREEN**

Run: `pnpm test -- app/api/redraft-picks/route.test.ts`

Expected: all existing route tests plus automatic-dispatch assertions PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/redraft-picks/route.ts app/api/redraft-picks/route.test.ts
git commit -m "feat: trigger round recaps after pick persistence"
```

### Task 5: Verify and exercise one completed-round path

**Files:**
- No source changes expected.

**Interfaces:**
- Consumes: configured database and Discord webhook.
- Produces: verified automatic behavior without modifying existing picks.

- [ ] **Step 1: Run full verification**

Run `pnpm test`, `pnpm build`, and `git diff --check`.

Expected: all tests pass, build exits 0, and diff check is clean.

- [ ] **Step 2: Verify idempotency without sending a duplicate**

Use the test suite’s duplicate-claim test and a read-only query of `redraft_round_recaps`; do not manually PATCH an existing completed pick against the live webhook.

- [ ] **Step 3: Report the rollout**

Report test count, build result, schema readiness, and that automatic recaps are limited to completed rounds and contain plain text only. Do not send a live recap unless a new round is actually completed by a real pick.
