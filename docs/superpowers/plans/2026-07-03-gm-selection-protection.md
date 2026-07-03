# GM Selection Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect franchise and player selections by authenticated GM ownership, while adding serverless-compatible live updates, presence, and deterministic conflict handling.

**Architecture:** Stack Auth identifies the current signed-in user, a server helper maps that user to `neon_auth."user"`, and all write APIs enforce ownership with SQL predicates. Draft state is persisted in Postgres, live sync uses an append-only `draft_events` table plus SSE, and presence uses persisted heartbeats. Client components remain broad read-only boards, but only owner-controlled rows are editable.

**Tech Stack:** Next.js 16 App Router, React 19, Vitest, `@neondatabase/serverless`, Stack Auth `@stackframe/stack`, Postgres via Neon, SSE with `ReadableStream` and `EventSource`.

---

## File Structure

- Create: `stack/server.ts` - server-side Stack Auth app instance.
- Create: `stack/client.ts` - client-side Stack Auth app instance for hooks and provider.
- Create: `app/handler/[...stack]/page.tsx` - Stack Auth handler route.
- Modify: `app/layout.tsx` - wrap the app in Stack Auth provider and theme.
- Modify: `app/draft/franchises/page.tsx` - require a signed-in user.
- Modify: `app/draft/redraft/page.tsx` - require a signed-in user.
- Modify: `.env.example` - document Stack Auth variables.
- Modify: `package.json` and `pnpm-lock.yaml` - add `@stackframe/stack`.
- Create: `src/lib/current-user.ts` - resolve current Stack user to a Neon auth user.
- Create: `src/lib/current-user.test.ts` - unit tests for current-user resolution.
- Modify: `src/lib/redraft.ts` and `src/lib/redraft.test.ts` - add view types and redraft pick helpers.
- Create: `src/lib/draft-events.ts` and `src/lib/draft-events.test.ts` - event schema, event inserts, cursor reads, and SSE formatting.
- Modify: `src/lib/franchise-db.ts` and `src/lib/franchise-db.test.ts` - add owner-aware franchise updates and editable metadata.
- Modify: `app/api/franchise-selections/route.ts` and `app/api/franchise-selections/route.test.ts` - enforce auth, remove global reset for GMs, and return ownership metadata.
- Create: `src/lib/redraft-picks.ts` and `src/lib/redraft-picks.test.ts` - player pick persistence and owner-aware mutations.
- Create: `app/api/redraft-picks/route.ts` and `app/api/redraft-picks/route.test.ts` - player pick API.
- Create: `app/api/draft-events/route.ts` and `app/api/draft-events/route.test.ts` - SSE route.
- Create: `src/lib/draft-presence.ts` and `src/lib/draft-presence.test.ts` - presence schema, heartbeat, and active GM reads.
- Create: `app/api/draft-presence/route.ts` and `app/api/draft-presence/route.test.ts` - presence API.
- Create: `app/_components/useDraftLive.ts` - client hook for SSE reconnect and fallback refetch.
- Create: `app/_components/useDraftPresence.ts` - client hook for heartbeat.
- Modify: `app/_components/FranchiseSelectionBoard.tsx` - disable non-owner rows, remove reset, subscribe to live updates, show presence.
- Modify: `app/_components/RedraftRoom.tsx` - load server picks, enforce editable picks, subscribe to live updates, show presence.
- Modify: `app/_components/draft-board-visibility.test.tsx` or add focused component tests - assert non-owner controls render disabled.

## Task 1: Stack Auth App Router Setup

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `.env.example`
- Create: `stack/server.ts`
- Create: `stack/client.ts`
- Create: `app/handler/[...stack]/page.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/draft/franchises/page.tsx`
- Modify: `app/draft/redraft/page.tsx`

- [ ] **Step 1: Install Stack Auth**

Run:

```bash
pnpm add @stackframe/stack
```

Expected: `package.json` contains `@stackframe/stack` in `dependencies`, and `pnpm-lock.yaml` changes.

- [ ] **Step 2: Add Stack environment variables**

Modify `.env.example` so it contains:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
NEXT_PUBLIC_STACK_PROJECT_ID="your-stack-project-id"
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY="your-stack-publishable-client-key"
STACK_SECRET_SERVER_KEY="your-stack-secret-server-key"
```

- [ ] **Step 3: Add Stack server and client apps**

Create `stack/server.ts`:

```ts
import "server-only";
import { StackServerApp } from "@stackframe/stack";

export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie"
});
```

Create `stack/client.ts`:

```ts
"use client";

import { StackClientApp } from "@stackframe/stack";

export const stackClientApp = new StackClientApp();
```

- [ ] **Step 4: Add the Stack handler route**

Create `app/handler/[...stack]/page.tsx`:

```tsx
import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "../../../stack/server";

export default function Handler(props: { params: unknown; searchParams: unknown }) {
  return <StackHandler app={stackServerApp} fullPage routeProps={props} />;
}
```

- [ ] **Step 5: Wrap the app with Stack provider and theme**

Modify `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackServerApp } from "../stack/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Simulateur de Draft NBA",
  description:
    "Simulez un ordre de draft NBA avec une lottery simplifiee et equitable."
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <StackProvider app={stackServerApp}>
          <StackTheme>{children}</StackTheme>
        </StackProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Protect draft pages**

Modify `app/draft/franchises/page.tsx`:

```tsx
import { stackServerApp } from "../../../stack/server";
import { AppHeader } from "../../_components/AppHeader";
import { FranchiseSelectionBoard } from "../../_components/FranchiseSelectionBoard";

export default async function FranchiseSelectionPage() {
  await stackServerApp.getUser({ or: "redirect" });

  return (
    <main className="app-shell">
      <AppHeader
        activeHref="/draft/franchises"
        description="Attribue les franchises NBA aux GMs selon le rang tire au sort hors app."
        eyebrow="NBA2KFL Draft Room"
        title="Franchises"
      />

      <section className="workflow-page" aria-label="Selection des franchises">
        <FranchiseSelectionBoard />
      </section>
    </main>
  );
}
```

Modify `app/draft/redraft/page.tsx` the same way:

```tsx
import { stackServerApp } from "../../../stack/server";
import { AppHeader } from "../../_components/AppHeader";
import { RedraftRoom } from "../../_components/RedraftRoom";

export default async function RedraftPage() {
  await stackServerApp.getUser({ or: "redirect" });

  return (
    <main className="app-shell">
      <AppHeader
        activeHref="/draft/redraft"
        description="Selectionne les joueurs avec un ordre snake base sur les franchises attribuees."
        eyebrow="NBA2KFL Draft Room"
        title="Redraft"
      />

      <section className="workflow-page" aria-label="Redraft joueurs">
        <RedraftRoom />
      </section>
    </main>
  );
}
```

- [ ] **Step 7: Verify build-time imports**

Run:

```bash
pnpm build
```

Expected: build reaches application compilation. If it fails because Stack env vars are missing locally, add placeholder values to `.env.local` outside git and rerun.

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml .env.example stack/server.ts stack/client.ts app/handler/[...stack]/page.tsx app/layout.tsx app/draft/franchises/page.tsx app/draft/redraft/page.tsx
git commit -m "feat: add stack auth protection shell"
```

## Task 2: Current GM User Resolution

**Files:**
- Create: `src/lib/current-user.test.ts`
- Create: `src/lib/current-user.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/current-user.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import type { DraftDbClient } from "./draft-db";
import {
  AuthRequiredError,
  ForbiddenUserError,
  resolveCurrentUser,
  type StackUserLike
} from "./current-user";

describe("resolveCurrentUser", () => {
  it("requires a signed-in Stack user", async () => {
    const db = createDbClient();

    await expect(resolveCurrentUser(db, null)).rejects.toBeInstanceOf(
      AuthRequiredError
    );
    expect(db.query).not.toHaveBeenCalled();
  });

  it("requires a primary email on the Stack user", async () => {
    const db = createDbClient();

    await expect(
      resolveCurrentUser(db, { displayName: "Anna", primaryEmail: null })
    ).rejects.toBeInstanceOf(ForbiddenUserError);
    expect(db.query).not.toHaveBeenCalled();
  });

  it("rejects users that are not linked in Neon auth", async () => {
    const db = createDbClient([[]]);

    await expect(
      resolveCurrentUser(db, {
        displayName: "Anna",
        primaryEmail: "anna@nba2kfl.local"
      })
    ).rejects.toBeInstanceOf(ForbiddenUserError);
  });

  it("normalizes the email and returns the linked Neon user", async () => {
    const db = createDbClient([[{ id: "user-1", email: "anna@nba2kfl.local" }]]);

    await expect(
      resolveCurrentUser(db, {
        displayName: "Anna",
        primaryEmail: "ANNA@NBA2KFL.LOCAL"
      })
    ).resolves.toEqual({
      userId: "user-1",
      email: "anna@nba2kfl.local",
      displayName: "Anna"
    });
  });
});

function createDbClient(rowsByCall: Record<string, unknown>[][] = []): DraftDbClient {
  return {
    query: vi.fn().mockImplementation(() => Promise.resolve(rowsByCall.shift() ?? []))
  };
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test src/lib/current-user.test.ts
```

Expected: FAIL because `src/lib/current-user.ts` does not exist.

- [ ] **Step 3: Implement current-user helper**

Create `src/lib/current-user.ts`:

```ts
import type { DraftDbClient } from "./draft-db";

export type StackUserLike = {
  displayName?: string | null;
  primaryEmail?: string | null;
};

export type CurrentDraftUser = {
  userId: string;
  email: string;
  displayName: string;
};

type NeonUserRow = {
  id: string;
  email: string;
};

export class AuthRequiredError extends Error {
  constructor() {
    super("Authentication required.");
  }
}

export class ForbiddenUserError extends Error {
  constructor(message: string = "User is not linked to a GM account.") {
    super(message);
  }
}

export async function resolveCurrentUser(
  db: DraftDbClient,
  stackUser: StackUserLike | null
): Promise<CurrentDraftUser> {
  if (!stackUser) {
    throw new AuthRequiredError();
  }

  const email = stackUser.primaryEmail?.trim().toLowerCase();

  if (!email) {
    throw new ForbiddenUserError("Signed-in user has no primary email.");
  }

  const rows = await db.query<NeonUserRow>(
    'SELECT id, email FROM neon_auth."user" WHERE lower(email) = lower($1) LIMIT 1',
    [email]
  );
  const row = rows[0];

  if (!row) {
    throw new ForbiddenUserError();
  }

  return {
    userId: row.id,
    email: row.email.toLowerCase(),
    displayName: stackUser.displayName?.trim() || row.email
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm test src/lib/current-user.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/current-user.ts src/lib/current-user.test.ts
git commit -m "feat: resolve current draft user"
```

## Task 3: Draft Event Log

**Files:**
- Create: `src/lib/draft-events.test.ts`
- Create: `src/lib/draft-events.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/draft-events.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import type { DraftDbClient } from "./draft-db";
import {
  ensureDraftEventSchema,
  formatSseEvent,
  insertDraftEvent,
  loadDraftEventsAfter
} from "./draft-events";

describe("draft events", () => {
  it("creates the draft event table", async () => {
    const db = createDbClient();

    await ensureDraftEventSchema(db);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS draft_events")
    );
  });

  it("inserts a typed event", async () => {
    const db = createDbClient([[{ id: "12" }]]);

    await expect(
      insertDraftEvent(db, "redraft_pick_changed", { pickNumber: 1 })
    ).resolves.toBe(12);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO draft_events"),
      ["redraft_pick_changed", JSON.stringify({ pickNumber: 1 })]
    );
  });

  it("loads events after a cursor", async () => {
    const db = createDbClient([
      [{ id: "13", event_type: "presence_changed", payload: { userId: "u1" } }]
    ]);

    await expect(loadDraftEventsAfter(db, 12)).resolves.toEqual([
      { id: 13, eventType: "presence_changed", payload: { userId: "u1" } }
    ]);
  });

  it("formats one SSE message", () => {
    expect(
      formatSseEvent({
        id: 13,
        eventType: "presence_changed",
        payload: { userId: "u1" }
      })
    ).toBe('id: 13\nevent: presence_changed\ndata: {"userId":"u1"}\n\n');
  });
});

function createDbClient(rowsByCall: Record<string, unknown>[][] = []): DraftDbClient {
  return {
    query: vi.fn().mockImplementation(() => Promise.resolve(rowsByCall.shift() ?? []))
  };
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test src/lib/draft-events.test.ts
```

Expected: FAIL because `src/lib/draft-events.ts` does not exist.

- [ ] **Step 3: Implement event helper**

Create `src/lib/draft-events.ts`:

```ts
import type { DraftDbClient } from "./draft-db";

export type DraftEventType =
  | "franchise_selection_changed"
  | "redraft_pick_changed"
  | "presence_changed"
  | "conflict_resolved";

export type DraftEvent = {
  id: number;
  eventType: DraftEventType;
  payload: unknown;
};

type DraftEventRow = {
  id: number | string;
  event_type: DraftEventType;
  payload: unknown;
};

export async function ensureDraftEventSchema(db: DraftDbClient) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS draft_events (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      event_type text NOT NULL,
      payload jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

export async function insertDraftEvent(
  db: DraftDbClient,
  eventType: DraftEventType,
  payload: unknown
) {
  const rows = await db.query<{ id: number | string }>(
    `
      INSERT INTO draft_events (event_type, payload)
      VALUES ($1, $2::jsonb)
      RETURNING id
    `,
    [eventType, JSON.stringify(payload)]
  );

  return Number(rows[0]?.id ?? 0);
}

export async function loadDraftEventsAfter(db: DraftDbClient, afterId: number) {
  const rows = await db.query<DraftEventRow>(
    `
      SELECT id, event_type, payload
      FROM draft_events
      WHERE id > $1
      ORDER BY id
      LIMIT 100
    `,
    [afterId]
  );

  return rows.map((row) => ({
    id: Number(row.id),
    eventType: row.event_type,
    payload: row.payload
  }));
}

export function formatSseEvent(event: DraftEvent) {
  return [
    `id: ${event.id}`,
    `event: ${event.eventType}`,
    `data: ${JSON.stringify(event.payload)}`,
    "",
    ""
  ].join("\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm test src/lib/draft-events.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/draft-events.ts src/lib/draft-events.test.ts
git commit -m "feat: add draft event log"
```

## Task 4: Owner-Aware Franchise Persistence

**Files:**
- Modify: `src/lib/franchise-db.test.ts`
- Modify: `src/lib/franchise-db.ts`
- Modify: `src/lib/redraft.ts`
- Modify: `src/lib/redraft.test.ts`

- [ ] **Step 1: Write failing tests for editable metadata and owner updates**

Append to `src/lib/franchise-db.test.ts`:

```ts
it("marks only the current user's franchise slots editable", async () => {
  const db = createDbClient([createSelectionRows()]);

  const selections = await loadFranchiseSelections(db, TEAM_IDS, "user-anna");

  expect(selections[0]).toMatchObject({ slot: 1, canEdit: true });
  expect(selections[1]).toMatchObject({ slot: 2, canEdit: false });
});

it("updates one owned slot and inserts an event in the same SQL statement", async () => {
  const db = createDbClient([[{ slot: 1, event_id: "21" }]]);

  await updateFranchiseSelection(db, {
    slot: 1,
    teamId: NBA_TEAMS[0].id,
    validTeamIds: TEAM_IDS,
    currentUserId: "user-anna"
  });

  expect(db.query).toHaveBeenCalledWith(
    expect.stringContaining("WITH updated_slot AS"),
    [1, NBA_TEAMS[0].id, "user-anna"]
  );
});

it("rejects franchise updates for slots owned by another user", async () => {
  const db = createDbClient([[]]);

  await expect(
    updateFranchiseSelection(db, {
      slot: 1,
      teamId: NBA_TEAMS[0].id,
      validTeamIds: TEAM_IDS,
      currentUserId: "other-user"
    })
  ).rejects.toThrow("GM draft slot 1 is not owned by this user.");
});
```

Update `createSelectionRows()` in the same file so each row includes `user_id`:

```ts
function createSelectionRows() {
  return GM_DRAFT_SLOT_LINKS.map((slot) => ({
    slot: slot.slot,
    gm_name: slot.gmName,
    user_id: slot.slot === 1 ? "user-anna" : `user-${slot.slot}`,
    team_id:
      slot.slot === 1
        ? NBA_TEAMS[0].id
        : slot.slot === 2
          ? NBA_TEAMS[1].id
          : null
  }));
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test src/lib/franchise-db.test.ts
```

Expected: FAIL because current signatures do not accept `currentUserId`, rows do not expose `canEdit`, and SQL is not owner-aware.

- [ ] **Step 3: Add view type**

Modify `src/lib/redraft.ts`:

```ts
export type FranchiseSelectionView = FranchiseSelection & {
  canEdit: boolean;
  isOnline?: boolean;
  activePage?: "franchises" | "redraft";
};
```

- [ ] **Step 4: Update franchise DB helper**

Modify `src/lib/franchise-db.ts`:

```ts
import type { DraftDbClient } from "./draft-db";
import {
  createDraftSlots,
  GM_DRAFT_SLOT_LINKS,
  parseFranchiseSelections,
  type FranchiseSelectionView
} from "./redraft";

type FranchiseSelectionRow = {
  slot: number;
  gm_name: string;
  user_id: string;
  team_id: string | null;
};

type UpdatedSlotRow = {
  slot: number;
  event_id: number | string;
};

export async function loadFranchiseSelections(
  db: DraftDbClient,
  validTeamIds: readonly string[],
  currentUserId?: string
): Promise<FranchiseSelectionView[]> {
  const rows = await db.query<FranchiseSelectionRow>(`
    SELECT slot, gm_name, user_id, team_id
    FROM gm_draft_slots
    ORDER BY slot
  `);
  const storedSelections = rows.map((row) => ({
    slot: row.slot,
    gmName: row.gm_name,
    teamId: row.team_id
  }));
  const parsedSelections =
    parseFranchiseSelections(
      JSON.stringify(storedSelections),
      GM_DRAFT_SLOT_LINKS.length,
      validTeamIds
    ) ?? createDraftSlots(GM_DRAFT_SLOT_LINKS.length);
  const rowsBySlot = new Map(rows.map((row) => [row.slot, row]));

  return parsedSelections.map((selection) => ({
    ...selection,
    canEdit: rowsBySlot.get(selection.slot)?.user_id === currentUserId
  }));
}

export async function updateFranchiseSelection(
  db: DraftDbClient,
  input: {
    slot: number;
    teamId: string | null;
    validTeamIds: readonly string[];
    currentUserId: string;
  }
) {
  validateSlot(input.slot);
  validateTeamId(input.teamId, input.validTeamIds);

  const rows = await db.query<UpdatedSlotRow>(
    `
      WITH updated_slot AS (
        UPDATE gm_draft_slots
        SET
          team_id = $2,
          updated_at = now()
        WHERE slot = $1 AND user_id = $3
        RETURNING slot, gm_name, team_id
      ),
      inserted_event AS (
        INSERT INTO draft_events (event_type, payload)
        SELECT
          'franchise_selection_changed',
          jsonb_build_object(
            'slot', slot,
            'gmName', gm_name,
            'teamId', team_id
          )
        FROM updated_slot
        RETURNING id
      )
      SELECT updated_slot.slot, inserted_event.id AS event_id
      FROM updated_slot
      CROSS JOIN inserted_event
    `,
    [input.slot, input.teamId, input.currentUserId]
  );

  if (!rows[0]) {
    throw new Error(`GM draft slot ${input.slot} is not owned by this user.`);
  }
}
```

Keep existing `ensureFranchiseSelectionSchema`, `seedGmDraftSlots`, validation helpers, and remove `clearFranchiseSelections` export if no other code uses it after Task 5.

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
pnpm test src/lib/franchise-db.test.ts src/lib/redraft.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/franchise-db.ts src/lib/franchise-db.test.ts src/lib/redraft.ts src/lib/redraft.test.ts
git commit -m "feat: protect franchise selection ownership"
```

## Task 5: Authenticated Franchise API

**Files:**
- Modify: `app/api/franchise-selections/route.test.ts`
- Modify: `app/api/franchise-selections/route.ts`

- [ ] **Step 1: Write failing API tests**

Modify mocks in `app/api/franchise-selections/route.test.ts`:

```ts
import { stackServerApp } from "../../../stack/server";
import { resolveCurrentUser, AuthRequiredError, ForbiddenUserError } from "@/lib/current-user";
```

Add mocks:

```ts
vi.mock("../../../stack/server", () => ({
  stackServerApp: {
    getUser: vi.fn()
  }
}));

vi.mock("@/lib/current-user", () => ({
  AuthRequiredError: class AuthRequiredError extends Error {},
  ForbiddenUserError: class ForbiddenUserError extends Error {},
  resolveCurrentUser: vi.fn()
}));
```

Update `beforeEach`:

```ts
vi.mocked(stackServerApp.getUser).mockResolvedValue({
  displayName: "Anna",
  primaryEmail: "anna@nba2kfl.local"
});
vi.mocked(resolveCurrentUser).mockResolvedValue({
  userId: "user-anna",
  email: "anna@nba2kfl.local",
  displayName: "Anna"
});
```

Replace the update assertion:

```ts
expect(updateFranchiseSelection).toHaveBeenCalledWith(db, {
  slot: 1,
  teamId: "bos",
  validTeamIds: expect.any(Array),
  currentUserId: "user-anna"
});
```

Add tests:

```ts
it("requires authentication before updating a franchise", async () => {
  vi.mocked(resolveCurrentUser).mockRejectedValue(new AuthRequiredError());

  const response = await PATCH(
    new Request("http://localhost/api/franchise-selections", {
      body: JSON.stringify({ slot: 1, teamId: "bos" }),
      method: "PATCH"
    })
  );

  expect(response.status).toBe(401);
  expect(updateFranchiseSelection).not.toHaveBeenCalled();
});

it("returns forbidden when a GM updates another GM slot", async () => {
  vi.mocked(updateFranchiseSelection).mockRejectedValue(
    new Error("GM draft slot 2 is not owned by this user.")
  );

  const response = await PATCH(
    new Request("http://localhost/api/franchise-selections", {
      body: JSON.stringify({ slot: 2, teamId: "bos" }),
      method: "PATCH"
    })
  );
  const payload = await response.json();

  expect(response.status).toBe(403);
  expect(payload).toEqual({ error: "Ce choix appartient a un autre GM." });
});

it("does not expose a global reset route for GMs", async () => {
  const response = await DELETE();

  expect(response.status).toBe(405);
  expect(clearFranchiseSelections).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test app/api/franchise-selections/route.test.ts
```

Expected: FAIL because route does not use current-user and still exposes `DELETE`.

- [ ] **Step 3: Implement authenticated route behavior**

Modify `app/api/franchise-selections/route.ts`:

```ts
import { stackServerApp } from "../../../stack/server";
import { NBA_TEAMS } from "@/data/teams";
import { AuthRequiredError, ForbiddenUserError, resolveCurrentUser } from "@/lib/current-user";
import { getDraftDbClient, type DraftDbClient } from "@/lib/draft-db";
import {
  ensureFranchiseSelectionSchema,
  loadFranchiseSelections,
  seedGmDraftSlots,
  updateFranchiseSelection
} from "@/lib/franchise-db";

export const dynamic = "force-dynamic";

const TEAM_IDS = NBA_TEAMS.map((team) => team.id);

export async function GET() {
  try {
    const db = await prepareFranchiseSelectionDb();
    const currentUser = await getCurrentDraftUser(db);

    return selectionsResponse(db, currentUser.userId);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  const payload = await parsePayload(request);

  if (!payload) {
    return NextResponse.json(
      { error: "Selection de franchise invalide." },
      { status: 400 }
    );
  }

  try {
    const db = await prepareFranchiseSelectionDb();
    const currentUser = await getCurrentDraftUser(db);

    await updateFranchiseSelection(db, {
      slot: payload.slot,
      teamId: payload.teamId,
      validTeamIds: TEAM_IDS,
      currentUserId: currentUser.userId
    });

    return selectionsResponse(db, currentUser.userId);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Reset global non disponible pour les GMs." },
    { status: 405 }
  );
}

async function getCurrentDraftUser(db: DraftDbClient) {
  return resolveCurrentUser(db, await stackServerApp.getUser());
}

async function selectionsResponse(db: DraftDbClient, currentUserId: string) {
  return NextResponse.json({
    selections: await loadFranchiseSelections(db, TEAM_IDS, currentUserId)
  });
}

function apiErrorResponse(error: unknown) {
  if (error instanceof AuthRequiredError) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  if (error instanceof ForbiddenUserError || isOwnershipError(error)) {
    return NextResponse.json(
      { error: "Ce choix appartient a un autre GM." },
      { status: 403 }
    );
  }

  if (isUniqueViolation(error)) {
    return NextResponse.json(
      { error: "Cette franchise est deja attribuee." },
      { status: 409 }
    );
  }

  return databaseErrorResponse(error);
}

function isOwnershipError(error: unknown) {
  return error instanceof Error && error.message.includes("not owned by this user");
}
```

Keep `prepareFranchiseSelectionDb`, `parsePayload`, `isUniqueViolation`, and `databaseErrorResponse`.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm test app/api/franchise-selections/route.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/franchise-selections/route.ts app/api/franchise-selections/route.test.ts
git commit -m "feat: protect franchise selection api"
```

## Task 6: Redraft Player Pick Persistence

**Files:**
- Create: `src/lib/redraft-picks.test.ts`
- Create: `src/lib/redraft-picks.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/redraft-picks.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { NBA_TEAMS } from "@/data/teams";
import type { DraftDbClient } from "./draft-db";
import { createSnakeDraftPicks, type FranchiseSelection } from "./redraft";
import {
  ensureRedraftPickSchema,
  loadRedraftPicks,
  updateRedraftPick
} from "./redraft-picks";

const selections: FranchiseSelection[] = [
  { slot: 1, gmName: "Anna", teamId: NBA_TEAMS[0].id },
  { slot: 2, gmName: "Ellias", teamId: NBA_TEAMS[1].id }
];

describe("redraft picks persistence", () => {
  it("creates the redraft player picks table and unique player index", async () => {
    const db = createDbClient();

    await ensureRedraftPickSchema(db);

    expect(db.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("CREATE TABLE IF NOT EXISTS redraft_player_picks")
    );
    expect(db.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("CREATE UNIQUE INDEX IF NOT EXISTS redraft_player_picks_player_name_key")
    );
  });

  it("loads picks as a pick-number map", async () => {
    const db = createDbClient([[{ pick_number: 1, player_name: "Joueur 1" }]]);

    await expect(loadRedraftPicks(db)).resolves.toEqual({ "1": "Joueur 1" });
  });

  it("upserts an owned pick and inserts an event", async () => {
    const db = createDbClient([[{ pick_number: 1, event_id: "31" }]]);
    const draftPicks = createSnakeDraftPicks(selections, 2);

    await updateRedraftPick(db, {
      pickNumber: 1,
      playerName: "Joueur 1",
      draftPicks,
      currentUserId: "user-anna"
    });

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("WITH owned_slot AS"),
      [1, 1, 1, 1, "Joueur 1", "user-anna"]
    );
  });

  it("rejects picks for slots owned by another user", async () => {
    const db = createDbClient([[]]);
    const draftPicks = createSnakeDraftPicks(selections, 2);

    await expect(
      updateRedraftPick(db, {
        pickNumber: 2,
        playerName: "Joueur 2",
        draftPicks,
        currentUserId: "user-anna"
      })
    ).rejects.toThrow("Redraft pick 2 is not owned by this user.");
  });
});

function createDbClient(rowsByCall: Record<string, unknown>[][] = []): DraftDbClient {
  return {
    query: vi.fn().mockImplementation(() => Promise.resolve(rowsByCall.shift() ?? []))
  };
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test src/lib/redraft-picks.test.ts
```

Expected: FAIL because `src/lib/redraft-picks.ts` does not exist.

- [ ] **Step 3: Implement redraft pick helper**

Create `src/lib/redraft-picks.ts`:

```ts
import type { DraftDbClient } from "./draft-db";
import type { SnakeDraftPick } from "./redraft";

export type PicksByNumber = Record<string, string>;

type RedraftPickRow = {
  pick_number: number;
  player_name: string;
};

type UpdatedPickRow = {
  pick_number: number;
  event_id: number | string;
};

export async function ensureRedraftPickSchema(db: DraftDbClient) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS redraft_player_picks (
      pick_number integer PRIMARY KEY,
      slot integer NOT NULL REFERENCES gm_draft_slots(slot),
      round integer NOT NULL,
      round_pick integer NOT NULL,
      player_name text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS redraft_player_picks_player_name_key
    ON redraft_player_picks (player_name)
  `);
}

export async function loadRedraftPicks(db: DraftDbClient): Promise<PicksByNumber> {
  const rows = await db.query<RedraftPickRow>(`
    SELECT pick_number, player_name
    FROM redraft_player_picks
    ORDER BY pick_number
  `);

  return Object.fromEntries(
    rows.map((row) => [String(row.pick_number), row.player_name])
  );
}

export async function updateRedraftPick(
  db: DraftDbClient,
  input: {
    pickNumber: number;
    playerName: string | null;
    draftPicks: readonly SnakeDraftPick[];
    currentUserId: string;
  }
) {
  const pick = input.draftPicks.find((candidate) => candidate.pickNumber === input.pickNumber);

  if (!pick) {
    throw new Error("Invalid redraft pick.");
  }

  const normalizedPlayerName = input.playerName?.trim() || null;

  const rows = await db.query<UpdatedPickRow>(
    `
      WITH owned_slot AS (
        SELECT slot
        FROM gm_draft_slots
        WHERE slot = $2 AND user_id = $6
      ),
      deleted_pick AS (
        DELETE FROM redraft_player_picks
        WHERE pick_number = $1
          AND EXISTS (SELECT 1 FROM owned_slot)
          AND $5::text IS NULL
        RETURNING pick_number, slot, player_name
      ),
      upserted_pick AS (
        INSERT INTO redraft_player_picks (
          pick_number,
          slot,
          round,
          round_pick,
          player_name,
          updated_at
        )
        SELECT $1, $2, $3, $4, $5, now()
        FROM owned_slot
        WHERE $5::text IS NOT NULL
        ON CONFLICT (pick_number) DO UPDATE SET
          slot = excluded.slot,
          round = excluded.round,
          round_pick = excluded.round_pick,
          player_name = excluded.player_name,
          updated_at = now()
        RETURNING pick_number, slot, player_name
      ),
      changed_pick AS (
        SELECT pick_number, slot, player_name FROM upserted_pick
        UNION ALL
        SELECT pick_number, slot, NULL::text AS player_name FROM deleted_pick
      ),
      inserted_event AS (
        INSERT INTO draft_events (event_type, payload)
        SELECT
          'redraft_pick_changed',
          jsonb_build_object(
            'pickNumber', pick_number,
            'slot', slot,
            'playerName', player_name
          )
        FROM changed_pick
        RETURNING id
      )
      SELECT changed_pick.pick_number, inserted_event.id AS event_id
      FROM changed_pick
      CROSS JOIN inserted_event
    `,
    [
      input.pickNumber,
      pick.selection.slot,
      pick.round,
      pick.roundPick,
      normalizedPlayerName,
      input.currentUserId
    ]
  );

  if (!rows[0]) {
    throw new Error(`Redraft pick ${input.pickNumber} is not owned by this user.`);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm test src/lib/redraft-picks.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/redraft-picks.ts src/lib/redraft-picks.test.ts
git commit -m "feat: persist owned redraft picks"
```

## Task 7: Redraft Pick API

**Files:**
- Create: `app/api/redraft-picks/route.test.ts`
- Create: `app/api/redraft-picks/route.ts`

- [ ] **Step 1: Write failing API tests**

Create `app/api/redraft-picks/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { stackServerApp } from "../../../stack/server";
import { AuthRequiredError, resolveCurrentUser } from "@/lib/current-user";
import { getDraftDbClient } from "@/lib/draft-db";
import { loadFranchiseSelections } from "@/lib/franchise-db";
import {
  ensureRedraftPickSchema,
  loadRedraftPicks,
  updateRedraftPick
} from "@/lib/redraft-picks";
import { GET, PATCH } from "./route";

vi.mock("../../../stack/server", () => ({
  stackServerApp: { getUser: vi.fn() }
}));

vi.mock("@/lib/current-user", () => ({
  AuthRequiredError: class AuthRequiredError extends Error {},
  ForbiddenUserError: class ForbiddenUserError extends Error {},
  resolveCurrentUser: vi.fn()
}));

vi.mock("@/lib/draft-db", () => ({ getDraftDbClient: vi.fn() }));
vi.mock("@/lib/franchise-db", () => ({ loadFranchiseSelections: vi.fn() }));
vi.mock("@/lib/redraft-picks", () => ({
  ensureRedraftPickSchema: vi.fn(),
  loadRedraftPicks: vi.fn(),
  updateRedraftPick: vi.fn()
}));

const db = { query: vi.fn() };

describe("redraft picks API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDraftDbClient).mockReturnValue(db);
    vi.mocked(stackServerApp.getUser).mockResolvedValue({
      displayName: "Anna",
      primaryEmail: "anna@nba2kfl.local"
    });
    vi.mocked(resolveCurrentUser).mockResolvedValue({
      userId: "user-anna",
      email: "anna@nba2kfl.local",
      displayName: "Anna"
    });
    vi.mocked(loadFranchiseSelections).mockResolvedValue([
      { slot: 1, gmName: "Anna", teamId: "atl", canEdit: true }
    ]);
    vi.mocked(loadRedraftPicks).mockResolvedValue({ "1": "Joueur 1" });
  });

  it("loads current redraft picks", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ picks: { "1": "Joueur 1" } });
    expect(ensureRedraftPickSchema).toHaveBeenCalledWith(db);
  });

  it("updates an owned redraft pick", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/redraft-picks", {
        body: JSON.stringify({ pickNumber: 1, playerName: "Joueur 2" }),
        method: "PATCH"
      })
    );

    expect(response.status).toBe(200);
    expect(updateRedraftPick).toHaveBeenCalledWith(db, {
      pickNumber: 1,
      playerName: "Joueur 2",
      draftPicks: expect.any(Array),
      currentUserId: "user-anna"
    });
  });

  it("requires authentication before updating picks", async () => {
    vi.mocked(resolveCurrentUser).mockRejectedValue(new AuthRequiredError());

    const response = await PATCH(
      new Request("http://localhost/api/redraft-picks", {
        body: JSON.stringify({ pickNumber: 1, playerName: "Joueur 2" }),
        method: "PATCH"
      })
    );

    expect(response.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test app/api/redraft-picks/route.test.ts
```

Expected: FAIL because the route file does not exist.

- [ ] **Step 3: Implement redraft picks route**

Create `app/api/redraft-picks/route.ts`:

```ts
import { NextResponse } from "next/server";
import { stackServerApp } from "../../../stack/server";
import { NBA_TEAMS } from "@/data/teams";
import { AuthRequiredError, ForbiddenUserError, resolveCurrentUser } from "@/lib/current-user";
import { getDraftDbClient } from "@/lib/draft-db";
import { loadFranchiseSelections } from "@/lib/franchise-db";
import { createSnakeDraftPicks } from "@/lib/redraft";
import {
  ensureRedraftPickSchema,
  loadRedraftPicks,
  updateRedraftPick
} from "@/lib/redraft-picks";

export const dynamic = "force-dynamic";

const TEAM_IDS = NBA_TEAMS.map((team) => team.id);
const DEFAULT_REDRAFT_ROUNDS = 4;

export async function GET() {
  try {
    const db = getDraftDbClient();
    await ensureRedraftPickSchema(db);

    return NextResponse.json({ picks: await loadRedraftPicks(db) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  const payload = await parsePayload(request);

  if (!payload) {
    return NextResponse.json({ error: "Selection joueur invalide." }, { status: 400 });
  }

  try {
    const db = getDraftDbClient();
    const currentUser = await resolveCurrentUser(db, await stackServerApp.getUser());
    await ensureRedraftPickSchema(db);

    const selections = await loadFranchiseSelections(db, TEAM_IDS, currentUser.userId);
    const draftPicks = createSnakeDraftPicks(selections, DEFAULT_REDRAFT_ROUNDS);

    await updateRedraftPick(db, {
      pickNumber: payload.pickNumber,
      playerName: payload.playerName,
      draftPicks,
      currentUserId: currentUser.userId
    });

    return NextResponse.json({ picks: await loadRedraftPicks(db) });
  } catch (error) {
    return errorResponse(error);
  }
}

async function parsePayload(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return null;
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as Record<string, unknown>;

  if (!Number.isInteger(candidate.pickNumber)) {
    return null;
  }

  if (
    candidate.playerName !== null &&
    typeof candidate.playerName !== "string"
  ) {
    return null;
  }

  return {
    pickNumber: candidate.pickNumber as number,
    playerName: candidate.playerName as string | null
  };
}

function errorResponse(error: unknown) {
  if (error instanceof AuthRequiredError) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  if (
    error instanceof ForbiddenUserError ||
    (error instanceof Error && error.message.includes("not owned by this user"))
  ) {
    return NextResponse.json(
      { error: "Ce choix appartient a un autre GM." },
      { status: 403 }
    );
  }

  if (isUniqueViolation(error)) {
    return NextResponse.json(
      { error: "Ce joueur est deja attribue." },
      { status: 409 }
    );
  }

  console.error("Redraft picks database error", error);
  return NextResponse.json(
    { error: "La base de donnees est indisponible." },
    { status: 500 }
  );
}

function isUniqueViolation(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "23505");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm test app/api/redraft-picks/route.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/redraft-picks/route.ts app/api/redraft-picks/route.test.ts
git commit -m "feat: add protected redraft picks api"
```

## Task 8: SSE Draft Events API

**Files:**
- Create: `app/api/draft-events/route.test.ts`
- Create: `app/api/draft-events/route.ts`

- [ ] **Step 1: Write failing tests**

Create `app/api/draft-events/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { stackServerApp } from "../../../stack/server";
import { resolveCurrentUser } from "@/lib/current-user";
import { getDraftDbClient } from "@/lib/draft-db";
import { ensureDraftEventSchema, loadDraftEventsAfter } from "@/lib/draft-events";
import { GET } from "./route";

vi.mock("../../../stack/server", () => ({
  stackServerApp: { getUser: vi.fn() }
}));
vi.mock("@/lib/current-user", () => ({
  AuthRequiredError: class AuthRequiredError extends Error {},
  ForbiddenUserError: class ForbiddenUserError extends Error {},
  resolveCurrentUser: vi.fn()
}));
vi.mock("@/lib/draft-db", () => ({ getDraftDbClient: vi.fn() }));
vi.mock("@/lib/draft-events", () => ({
  ensureDraftEventSchema: vi.fn(),
  formatSseEvent: vi.fn((event) => `id: ${event.id}\nevent: ${event.eventType}\ndata: {}\n\n`),
  loadDraftEventsAfter: vi.fn()
}));

const db = { query: vi.fn() };

describe("draft events SSE API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDraftDbClient).mockReturnValue(db);
    vi.mocked(stackServerApp.getUser).mockResolvedValue({
      displayName: "Anna",
      primaryEmail: "anna@nba2kfl.local"
    });
    vi.mocked(resolveCurrentUser).mockResolvedValue({
      userId: "user-anna",
      email: "anna@nba2kfl.local",
      displayName: "Anna"
    });
    vi.mocked(loadDraftEventsAfter).mockResolvedValue([
      { id: 2, eventType: "presence_changed", payload: {} }
    ]);
  });

  it("streams events after Last-Event-ID", async () => {
    const response = await GET(
      new Request("http://localhost/api/draft-events", {
        headers: { "Last-Event-ID": "1" }
      })
    );

    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    expect(ensureDraftEventSchema).toHaveBeenCalledWith(db);
    expect(loadDraftEventsAfter).toHaveBeenCalledWith(db, 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test app/api/draft-events/route.test.ts
```

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement SSE route**

Create `app/api/draft-events/route.ts`:

```ts
import { stackServerApp } from "../../../stack/server";
import { AuthRequiredError, resolveCurrentUser } from "@/lib/current-user";
import { getDraftDbClient } from "@/lib/draft-db";
import {
  ensureDraftEventSchema,
  formatSseEvent,
  loadDraftEventsAfter
} from "@/lib/draft-events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SSE_STREAM_DURATION_MS = process.env.NODE_ENV === "test" ? 1 : 25000;

export async function GET(request: Request) {
  try {
    const db = getDraftDbClient();
    await resolveCurrentUser(db, await stackServerApp.getUser());
    await ensureDraftEventSchema(db);

    const url = new URL(request.url);
    const afterId = Number(
      url.searchParams.get("after") ?? request.headers.get("Last-Event-ID") ?? 0
    );
    const events = await loadDraftEventsAfter(
      db,
      Number.isFinite(afterId) ? afterId : 0
    );
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        for (const event of events) {
          controller.enqueue(encoder.encode(formatSseEvent(event)));
        }

        controller.enqueue(encoder.encode(": keepalive\n\n"));
        setTimeout(() => {
          controller.close();
        }, SSE_STREAM_DURATION_MS);
      }
    });

    return new Response(stream, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/event-stream; charset=utf-8",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      return Response.json({ error: "Authentification requise." }, { status: 401 });
    }

    console.error("Draft events stream error", error);
    return Response.json(
      { error: "La base de donnees est indisponible." },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm test app/api/draft-events/route.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/draft-events/route.ts app/api/draft-events/route.test.ts
git commit -m "feat: add draft events sse stream"
```

## Task 9: Presence Persistence and API

**Files:**
- Create: `src/lib/draft-presence.test.ts`
- Create: `src/lib/draft-presence.ts`
- Create: `app/api/draft-presence/route.test.ts`
- Create: `app/api/draft-presence/route.ts`

- [ ] **Step 1: Write failing DB tests**

Create `src/lib/draft-presence.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import type { DraftDbClient } from "./draft-db";
import {
  ensureDraftPresenceSchema,
  listActivePresence,
  updateDraftPresence
} from "./draft-presence";

describe("draft presence", () => {
  it("creates the presence table", async () => {
    const db = createDbClient();

    await ensureDraftPresenceSchema(db);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS draft_presence")
    );
  });

  it("upserts a heartbeat and inserts a presence event", async () => {
    const db = createDbClient([[{ user_id: "user-anna", event_id: "41" }]]);

    await updateDraftPresence(db, {
      userId: "user-anna",
      displayName: "Anna",
      activePage: "redraft",
      activeSlot: 1
    });

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("WITH upserted_presence AS"),
      ["user-anna", "Anna", "redraft", 1]
    );
  });

  it("lists only recently active users", async () => {
    const db = createDbClient([
      [{ user_id: "user-anna", display_name: "Anna", active_page: "redraft", active_slot: 1 }]
    ]);

    await expect(listActivePresence(db)).resolves.toEqual([
      { userId: "user-anna", displayName: "Anna", activePage: "redraft", activeSlot: 1 }
    ]);
  });
});

function createDbClient(rowsByCall: Record<string, unknown>[][] = []): DraftDbClient {
  return {
    query: vi.fn().mockImplementation(() => Promise.resolve(rowsByCall.shift() ?? []))
  };
}
```

- [ ] **Step 2: Run DB test to verify it fails**

Run:

```bash
pnpm test src/lib/draft-presence.test.ts
```

Expected: FAIL because `src/lib/draft-presence.ts` does not exist.

- [ ] **Step 3: Implement presence helper**

Create `src/lib/draft-presence.ts`:

```ts
import type { DraftDbClient } from "./draft-db";

export type DraftPageName = "franchises" | "redraft";

export type DraftPresence = {
  userId: string;
  displayName: string;
  activePage: DraftPageName;
  activeSlot: number | null;
};

type PresenceRow = {
  user_id: string;
  display_name: string;
  active_page: DraftPageName;
  active_slot: number | null;
};

export async function ensureDraftPresenceSchema(db: DraftDbClient) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS draft_presence (
      user_id uuid PRIMARY KEY REFERENCES neon_auth."user"(id),
      display_name text NOT NULL,
      active_page text NOT NULL,
      active_slot integer,
      last_seen_at timestamptz NOT NULL
    )
  `);
}

export async function updateDraftPresence(
  db: DraftDbClient,
  presence: DraftPresence
) {
  await db.query(
    `
      WITH upserted_presence AS (
        INSERT INTO draft_presence (
          user_id,
          display_name,
          active_page,
          active_slot,
          last_seen_at
        )
        VALUES ($1, $2, $3, $4, now())
        ON CONFLICT (user_id) DO UPDATE SET
          display_name = excluded.display_name,
          active_page = excluded.active_page,
          active_slot = excluded.active_slot,
          last_seen_at = now()
        RETURNING user_id, display_name, active_page, active_slot
      ),
      inserted_event AS (
        INSERT INTO draft_events (event_type, payload)
        SELECT
          'presence_changed',
          jsonb_build_object(
            'userId', user_id,
            'displayName', display_name,
            'activePage', active_page,
            'activeSlot', active_slot
          )
        FROM upserted_presence
        RETURNING id
      )
      SELECT upserted_presence.user_id, inserted_event.id AS event_id
      FROM upserted_presence
      CROSS JOIN inserted_event
    `,
    [
      presence.userId,
      presence.displayName,
      presence.activePage,
      presence.activeSlot
    ]
  );
}

export async function listActivePresence(db: DraftDbClient) {
  const rows = await db.query<PresenceRow>(`
    SELECT user_id, display_name, active_page, active_slot
    FROM draft_presence
    WHERE last_seen_at >= now() - interval '60 seconds'
    ORDER BY display_name
  `);

  return rows.map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    activePage: row.active_page,
    activeSlot: row.active_slot
  }));
}
```

- [ ] **Step 4: Add and implement API tests**

Create `app/api/draft-presence/route.test.ts` with the same mocking pattern as Task 7. The required assertions:

```ts
expect(updateDraftPresence).toHaveBeenCalledWith(db, {
  userId: "user-anna",
  displayName: "Anna",
  activePage: "redraft",
  activeSlot: 1
});
expect(response.status).toBe(200);
```

Then create `app/api/draft-presence/route.ts`:

```ts
import { NextResponse } from "next/server";
import { stackServerApp } from "../../../stack/server";
import { AuthRequiredError, resolveCurrentUser } from "@/lib/current-user";
import { getDraftDbClient } from "@/lib/draft-db";
import {
  ensureDraftPresenceSchema,
  listActivePresence,
  updateDraftPresence,
  type DraftPageName
} from "@/lib/draft-presence";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDraftDbClient();
    await ensureDraftPresenceSchema(db);
    return NextResponse.json({ presence: await listActivePresence(db) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const payload = await parsePayload(request);

  if (!payload) {
    return NextResponse.json({ error: "Presence invalide." }, { status: 400 });
  }

  try {
    const db = getDraftDbClient();
    const currentUser = await resolveCurrentUser(db, await stackServerApp.getUser());
    await ensureDraftPresenceSchema(db);
    await updateDraftPresence(db, {
      userId: currentUser.userId,
      displayName: currentUser.displayName,
      activePage: payload.activePage,
      activeSlot: payload.activeSlot
    });

    return NextResponse.json({ presence: await listActivePresence(db) });
  } catch (error) {
    return errorResponse(error);
  }
}

async function parsePayload(request: Request) {
  const payload = await request.json().catch(() => null);

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as Record<string, unknown>;

  if (candidate.activePage !== "franchises" && candidate.activePage !== "redraft") {
    return null;
  }

  if (
    candidate.activeSlot !== null &&
    candidate.activeSlot !== undefined &&
    !Number.isInteger(candidate.activeSlot)
  ) {
    return null;
  }

  return {
    activePage: candidate.activePage as DraftPageName,
    activeSlot: (candidate.activeSlot as number | null | undefined) ?? null
  };
}

function errorResponse(error: unknown) {
  if (error instanceof AuthRequiredError) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  console.error("Draft presence error", error);
  return NextResponse.json(
    { error: "La base de donnees est indisponible." },
    { status: 500 }
  );
}
```

- [ ] **Step 5: Run tests to verify pass**

Run:

```bash
pnpm test src/lib/draft-presence.test.ts app/api/draft-presence/route.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/draft-presence.ts src/lib/draft-presence.test.ts app/api/draft-presence/route.ts app/api/draft-presence/route.test.ts
git commit -m "feat: add draft presence heartbeats"
```

## Task 10: Client Live Hooks

**Files:**
- Create: `app/_components/useDraftLive.ts`
- Create: `app/_components/useDraftPresence.ts`

- [ ] **Step 1: Add SSE hook**

Create `app/_components/useDraftLive.ts`:

```ts
"use client";

import { useEffect, useRef } from "react";

type DraftLiveOptions = {
  onRefresh: () => void;
};

export function useDraftLive({ onRefresh }: DraftLiveOptions) {
  const lastEventIdRef = useRef(0);

  useEffect(() => {
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;
    let consecutiveErrors = 0;
    let eventSource: EventSource | null = null;

    function connect() {
      const url =
        lastEventIdRef.current > 0
          ? `/api/draft-events?after=${lastEventIdRef.current}`
          : "/api/draft-events";
      eventSource = new EventSource(url);

      function handleEvent(event: Event) {
        const message = event as MessageEvent<string>;
        consecutiveErrors = 0;
        lastEventIdRef.current = Number(
          message.lastEventId || lastEventIdRef.current
        );
        onRefresh();

        if (fallbackInterval) {
          clearInterval(fallbackInterval);
          fallbackInterval = null;
        }
      }

      eventSource.addEventListener("franchise_selection_changed", handleEvent);
      eventSource.addEventListener("redraft_pick_changed", handleEvent);
      eventSource.addEventListener("presence_changed", handleEvent);
      eventSource.addEventListener("conflict_resolved", handleEvent);

      eventSource.onerror = () => {
        consecutiveErrors += 1;
        eventSource?.close();

        if (consecutiveErrors >= 3 && !fallbackInterval) {
          fallbackInterval = setInterval(onRefresh, 15000);
        }
      };
    }

    connect();

    return () => {
      eventSource?.close();
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    };
  }, [onRefresh]);
}
```

- [ ] **Step 2: Add presence hook**

Create `app/_components/useDraftPresence.ts`:

```ts
"use client";

import { useEffect } from "react";

type DraftPresenceOptions = {
  activePage: "franchises" | "redraft";
  activeSlot?: number | null;
};

export function useDraftPresence({ activePage, activeSlot = null }: DraftPresenceOptions) {
  useEffect(() => {
    let isMounted = true;

    async function sendHeartbeat() {
      await fetch("/api/draft-presence", {
        body: JSON.stringify({ activePage, activeSlot }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      }).catch(() => undefined);
    }

    sendHeartbeat();
    const interval = setInterval(() => {
      if (isMounted) {
        sendHeartbeat();
      }
    }, 25000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activePage, activeSlot]);
}
```

- [ ] **Step 3: Run TypeScript build**

Run:

```bash
pnpm build
```

Expected: PASS or only missing local Stack env vars. If env vars are missing locally, add non-secret placeholders to `.env.local` and rerun.

- [ ] **Step 4: Commit**

```bash
git add app/_components/useDraftLive.ts app/_components/useDraftPresence.ts app/api/draft-events/route.ts
git commit -m "feat: add draft live client hooks"
```

## Task 11: Franchise Board UI Integration

**Files:**
- Modify: `app/_components/FranchiseSelectionBoard.tsx`
- Modify: `app/_components/draft-board-visibility.test.tsx` or create `app/_components/franchise-selection-board-view.test.tsx`

- [ ] **Step 1: Write failing static test**

Create `app/_components/franchise-selection-board-view.test.tsx` after extracting a presentational view:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FranchiseSelectionBoardView } from "./FranchiseSelectionBoard";

describe("FranchiseSelectionBoardView", () => {
  it("disables franchise controls for slots not owned by the current GM", () => {
    const markup = renderToStaticMarkup(
      <FranchiseSelectionBoardView
        assignedCount={1}
        errorMessage={null}
        isLoading={false}
        nextSelectionSlot={2}
        onUpdateTeam={vi.fn()}
        savingSlot={null}
        selectedTeamIds={new Set(["atl"])}
        selections={[
          { slot: 1, gmName: "Anna", teamId: "atl", canEdit: true },
          { slot: 2, gmName: "Ellias", teamId: null, canEdit: false }
        ]}
      />
    );

    expect(markup).toContain('aria-label="Franchise du rang 2"');
    expect(markup).toContain("disabled");
    expect(markup).not.toContain("Reinitialiser");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test app/_components/franchise-selection-board-view.test.tsx
```

Expected: FAIL because `FranchiseSelectionBoardView` is not exported.

- [ ] **Step 3: Extract view and integrate hooks**

Modify `app/_components/FranchiseSelectionBoard.tsx`:

- Import `useCallback`.
- Import `useDraftLive` and `useDraftPresence`.
- Remove `resetSelections`.
- Load `/api/franchise-selections` into `FranchiseSelectionView[]`.
- Export `FranchiseSelectionBoardView`.
- Disable a row when `!selection.canEdit || isLoading || savingSlot !== null`.
- Call `useDraftPresence({ activePage: "franchises", activeSlot: nextSelection?.slot ?? null })`.
- Call `useDraftLive({ onRefresh: loadSelections })` where `loadSelections` is a `useCallback`.

The disabled select condition should be:

```tsx
disabled={!selection.canEdit || isLoading || savingSlot !== null}
```

The status cell should distinguish owner controls:

```tsx
{savingSlot === selection.slot
  ? "Sauvegarde"
  : selectedTeam
    ? selectedTeam.abbreviation
    : selection.canEdit
      ? "A choisir"
      : "En attente GM"}
```

- [ ] **Step 4: Run tests to verify pass**

Run:

```bash
pnpm test app/_components/franchise-selection-board-view.test.tsx app/_components/draft-board-visibility.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/_components/FranchiseSelectionBoard.tsx app/_components/franchise-selection-board-view.test.tsx app/_components/draft-board-visibility.test.tsx
git commit -m "feat: lock franchise board rows by gm"
```

## Task 12: Redraft Room UI Integration

**Files:**
- Modify: `app/_components/RedraftRoom.tsx`
- Create: `app/_components/redraft-room-view.test.tsx`

- [ ] **Step 1: Write failing static test**

Create `app/_components/redraft-room-view.test.tsx` after extracting `RedraftPickRow`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { NBA_TEAMS } from "@/data/teams";
import type { SnakeDraftPick } from "@/lib/redraft";
import { RedraftPickRow } from "./RedraftRoom";

const pick: SnakeDraftPick = {
  pickNumber: 1,
  round: 1,
  roundPick: 1,
  selection: {
    slot: 1,
    gmName: "Anna",
    teamId: NBA_TEAMS[0].id
  }
};

describe("RedraftPickRow", () => {
  it("disables player selection for picks not owned by the current GM", () => {
    const markup = renderToStaticMarkup(
      <RedraftPickRow
        canEdit={false}
        currentPickNumber={1}
        onChange={vi.fn()}
        pick={pick}
        playerPool={["Joueur 1"]}
        selectedPlayer=""
        selectedPlayers={new Set()}
      />
    );

    expect(markup).toContain('aria-label="Joueur du pick 1"');
    expect(markup).toContain("disabled");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test app/_components/redraft-room-view.test.tsx
```

Expected: FAIL because `RedraftPickRow` is not exported and lacks `canEdit`.

- [ ] **Step 3: Update RedraftRoom data flow**

Modify `app/_components/RedraftRoom.tsx`:

- Remove `REDRAFT_PICKS_STORAGE_KEY` usage and `parseStoredPicks`.
- Keep rounds and player pool in `localStorage`.
- Fetch `/api/franchise-selections` and `/api/redraft-picks` in the initial load.
- Store `picksByNumber` from API response.
- Add `canEdit` to each row by reading `pick.selection.canEdit`.
- Make `updatePick` async and call `PATCH /api/redraft-picks`.
- On successful PATCH, replace `picksByNumber` with API `picks`.
- On 403/409, show `selectionLoadError` and refetch selections and picks.
- Use `useDraftPresence({ activePage: "redraft", activeSlot: currentPick?.selection.slot ?? null })`.
- Use `useDraftLive({ onRefresh: restoreDraftState })`.

The row prop should be:

```tsx
canEdit={Boolean("canEdit" in pick.selection && pick.selection.canEdit)}
```

The select should be disabled with:

```tsx
disabled={!canEdit}
```

- [ ] **Step 4: Run tests to verify pass**

Run:

```bash
pnpm test app/_components/redraft-room-view.test.tsx app/_components/draft-board-visibility.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/_components/RedraftRoom.tsx app/_components/redraft-room-view.test.tsx app/_components/draft-board-visibility.test.tsx
git commit -m "feat: lock redraft picks by gm"
```

## Task 13: Conflict Responses and Event Coverage

**Files:**
- Modify: `src/lib/franchise-db.test.ts`
- Modify: `src/lib/redraft-picks.test.ts`
- Modify: `app/api/franchise-selections/route.test.ts`
- Modify: `app/api/redraft-picks/route.test.ts`
- Modify: `src/lib/franchise-db.ts`
- Modify: `src/lib/redraft-picks.ts`
- Modify: `app/api/franchise-selections/route.ts`
- Modify: `app/api/redraft-picks/route.ts`

- [ ] **Step 1: Add failing conflict tests**

Add API tests asserting:

```ts
vi.mocked(updateFranchiseSelection).mockRejectedValue(
  Object.assign(new Error("duplicate team"), { code: "23505" })
);
expect(response.status).toBe(409);
expect(await response.json()).toEqual({
  error: "Cette franchise est deja attribuee.",
  selections
});
```

Add the equivalent redraft picks test:

```ts
vi.mocked(updateRedraftPick).mockRejectedValue(
  Object.assign(new Error("duplicate player"), { code: "23505" })
);
expect(response.status).toBe(409);
expect(await response.json()).toEqual({
  error: "Ce joueur est deja attribue.",
  picks: { "1": "Joueur 1" }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm test app/api/franchise-selections/route.test.ts app/api/redraft-picks/route.test.ts
```

Expected: FAIL because `409` payloads do not include refreshed state.

- [ ] **Step 3: Include refreshed state in conflict responses**

In `app/api/franchise-selections/route.ts`, for unique violations in `PATCH`, return:

```ts
return NextResponse.json(
  {
    error: "Cette franchise est deja attribuee.",
    selections: await loadFranchiseSelections(db, TEAM_IDS, currentUser.userId)
  },
  { status: 409 }
);
```

In `app/api/redraft-picks/route.ts`, for unique violations in `PATCH`, return:

```ts
return NextResponse.json(
  {
    error: "Ce joueur est deja attribue.",
    picks: await loadRedraftPicks(db)
  },
  { status: 409 }
);
```

- [ ] **Step 4: Run tests to verify pass**

Run:

```bash
pnpm test app/api/franchise-selections/route.test.ts app/api/redraft-picks/route.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/franchise-db.ts src/lib/franchise-db.test.ts src/lib/redraft-picks.ts src/lib/redraft-picks.test.ts app/api/franchise-selections/route.ts app/api/franchise-selections/route.test.ts app/api/redraft-picks/route.ts app/api/redraft-picks/route.test.ts
git commit -m "feat: return current state on draft conflicts"
```

## Task 14: Full Verification

**Files:**
- Potentially modify files touched by prior tasks only if verification exposes defects.

- [ ] **Step 1: Run focused tests**

Run:

```bash
pnpm test src/lib/current-user.test.ts src/lib/draft-events.test.ts src/lib/franchise-db.test.ts src/lib/redraft-picks.test.ts src/lib/draft-presence.test.ts app/api/franchise-selections/route.test.ts app/api/redraft-picks/route.test.ts app/api/draft-events/route.test.ts app/api/draft-presence/route.test.ts app/_components/franchise-selection-board-view.test.tsx app/_components/redraft-room-view.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run full test suite**

Run:

```bash
pnpm test
```

Expected: PASS.

- [ ] **Step 3: Run production build**

Run:

```bash
pnpm build
```

Expected: PASS with Stack environment variables present in `.env.local`.

- [ ] **Step 4: Start local server**

Run:

```bash
pnpm dev
```

Expected: Next.js starts on `http://localhost:3000` or the next available port.

- [ ] **Step 5: Manual browser checks**

In a signed-in session:

- Open `/draft/franchises`.
- Confirm only the current GM slots have enabled franchise selects.
- Choose one franchise and confirm another browser session refreshes from SSE or fallback refetch.
- Open `/draft/redraft`.
- Confirm only the current GM picks have enabled player selects.
- Select the same player from two sessions and confirm one session receives a `409` state refresh.
- Confirm presence badges update within 25 seconds and disappear after 60 seconds of inactivity.

- [ ] **Step 6: Commit verification fixes**

If verification required edits:

```bash
git add <changed-files>
git commit -m "fix: complete gm draft protection verification"
```

If no edits were needed, do not create an empty commit.

## Self-Review

- Spec coverage: auth, GM ownership, protected franchise selection, protected player selection, SSE, presence, conflict resolution, UI states, and verification are covered by Tasks 1-14.
- Placeholder scan: no task uses open-ended implementation placeholders; each code-changing task names files, expected tests, and target code shape.
- Type consistency: `CurrentDraftUser.userId`, `FranchiseSelectionView.canEdit`, `DraftPresence.activePage`, `PicksByNumber`, and `DraftEvent.eventType` are introduced before dependent tasks use them.
