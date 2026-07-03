# GM User Franchise Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the 30 GM franchise-selection slots in Postgres and link each slot to one of the 25 auth users.

**Architecture:** Keep the GM-to-user mapping in a small shared library, add a focused DB helper for `public.gm_draft_slots`, expose it through one App Router API endpoint, and make the franchise/redraft client screens consume that endpoint. Existing redraft snake logic keeps using `FranchiseSelection[]`.

**Tech Stack:** Next.js App Router, React client components, TypeScript, Neon serverless Postgres, Vitest.

---

### Task 1: Shared GM Slot Mapping

**Files:**
- Modify: `src/lib/redraft.ts`
- Modify: `src/lib/redraft.test.ts`

- [ ] **Step 1: Write failing tests for user mapping**

Add tests asserting 30 slots, 25 distinct user emails, and second-team account reuse:

```ts
expect(GM_DRAFT_SLOT_LINKS).toHaveLength(30);
expect(new Set(GM_DRAFT_SLOT_LINKS.map((slot) => slot.userEmail))).toHaveLength(25);
expect(GM_DRAFT_SLOT_LINKS[2]).toMatchObject({
  gmName: "Nico 2e équipe",
  userName: "Nico",
  userEmail: "nico@nba2kfl.local"
});
expect(GM_DRAFT_SLOT_LINKS[5]).toMatchObject({
  gmName: "Math",
  userName: "Mat Presti",
  userEmail: "mat-presti@nba2kfl.local"
});
```

- [ ] **Step 2: Run the redraft tests and verify failure**

Run: `pnpm test src/lib/redraft.test.ts`

Expected: fail because `GM_DRAFT_SLOT_LINKS` is not exported.

- [ ] **Step 3: Implement the mapping**

Add `GM_DRAFT_SLOT_LINKS` to `src/lib/redraft.ts` with `slot`, `gmName`, `userName`, and `userEmail`. Derive `DEFAULT_GM_DRAFT_ORDER` from that mapping.

- [ ] **Step 4: Run the redraft tests and verify pass**

Run: `pnpm test src/lib/redraft.test.ts`

Expected: pass.

### Task 2: Franchise Slot DB Helper

**Files:**
- Create: `src/lib/franchise-db.ts`
- Create: `src/lib/franchise-db.test.ts`

- [ ] **Step 1: Write failing DB helper tests**

Cover schema creation, slot seeding, loading selections, and updating one slot:

```ts
await ensureFranchiseSelectionSchema(db);
expect(db.query).toHaveBeenCalledWith(
  expect.stringContaining("CREATE TABLE IF NOT EXISTS gm_draft_slots")
);

await seedGmDraftSlots(db);
expect(db.query).toHaveBeenCalledWith(
  expect.stringContaining("ON CONFLICT (slot) DO UPDATE"),
  [expect.stringContaining("mat-presti@nba2kfl.local")]
);

const restored = await loadFranchiseSelections(db, ["atl", "bos"]);
expect(restored).toEqual([
  { slot: 1, gmName: "Anna", teamId: "atl" },
  { slot: 2, gmName: "Ellias", teamId: "bos" }
]);

await updateFranchiseSelection(db, 1, "atl", ["atl"]);
expect(db.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE gm_draft_slots"), [
  1,
  "atl"
]);
```

- [ ] **Step 2: Run the DB helper tests and verify failure**

Run: `pnpm test src/lib/franchise-db.test.ts`

Expected: fail because `src/lib/franchise-db.ts` does not exist.

- [ ] **Step 3: Implement the DB helper**

Create functions:

- `ensureFranchiseSelectionSchema(db)`
- `seedGmDraftSlots(db)`
- `loadFranchiseSelections(db, validTeamIds)`
- `updateFranchiseSelection(db, slot, teamId, validTeamIds)`
- `clearFranchiseSelections(db)`

Use `DraftDbClient` from `src/lib/draft-db.ts` and the shared mapping from `src/lib/redraft.ts`.

- [ ] **Step 4: Run DB helper tests and verify pass**

Run: `pnpm test src/lib/franchise-db.test.ts`

Expected: pass.

### Task 3: API Endpoint

**Files:**
- Create: `app/api/franchise-selections/route.ts`
- Create: `app/api/franchise-selections/route.test.ts`

- [ ] **Step 1: Write failing API tests**

Mock the DB helper and assert:

- `GET` returns `{ selections }`.
- `PATCH` validates `{ slot, teamId }` and returns refreshed selections.
- `DELETE` clears all selected teams and returns refreshed selections.

- [ ] **Step 2: Run API tests and verify failure**

Run: `pnpm test app/api/franchise-selections/route.test.ts`

Expected: fail because the route does not exist.

- [ ] **Step 3: Implement the route**

Use `getDraftDbClient`, `ensureFranchiseSelectionSchema`, `seedGmDraftSlots`, `loadFranchiseSelections`, `updateFranchiseSelection`, and `clearFranchiseSelections`. Return French error messages with status `400` for bad input, `409` for duplicate franchise conflicts, and `500` for database errors.

- [ ] **Step 4: Run API tests and verify pass**

Run: `pnpm test app/api/franchise-selections/route.test.ts`

Expected: pass.

### Task 4: Client Screens

**Files:**
- Modify: `app/_components/FranchiseSelectionBoard.tsx`
- Modify: `app/_components/RedraftRoom.tsx`

- [ ] **Step 1: Replace franchise localStorage with API calls**

In `FranchiseSelectionBoard`, load `/api/franchise-selections` on mount, `PATCH` when a team changes, and `DELETE` on reset. Keep duplicate options disabled client-side.

- [ ] **Step 2: Load redraft selections from API**

In `RedraftRoom`, load franchise selections from `/api/franchise-selections` on mount instead of reading `FRANCHISE_SELECTION_STORAGE_KEY`.

- [ ] **Step 3: Run full tests**

Run: `pnpm test`

Expected: pass.

### Task 5: Database Seeding and Verification

**Files:**
- No committed files expected.

- [ ] **Step 1: Apply schema and seed to Neon**

Run a temporary ignored script or endpoint-backed helper that creates `public.gm_draft_slots` and seeds the 30 rows from `GM_DRAFT_SLOT_LINKS`.

- [ ] **Step 2: Verify DB counts**

Run a verification query expecting:

- `30` rows in `public.gm_draft_slots`.
- `25` distinct `user_id` values.
- `0` missing user links.

- [ ] **Step 3: Run production build**

Run: `pnpm build`

Expected: pass.
