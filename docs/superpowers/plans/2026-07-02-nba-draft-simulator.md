# NBA Draft Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a French Next.js simulator that generates a fair random NBA draft order.

**Architecture:** Use the Next.js App Router with a small client component for stateful interactions. Keep data and shuffle logic outside React so the lottery behavior is easy to test. Style the app as a focused two-column dashboard with no official NBA assets.

**Tech Stack:** Next.js, React, TypeScript, CSS Modules/global CSS, Vitest.

---

### Task 1: Scaffold Project Files

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`

- [ ] **Step 1: Create minimal Next.js configuration**

Create the project with App Router, TypeScript, scripts for `dev`, `build`, `lint`, and `test`, and package dependencies for Next.js, React, TypeScript, ESLint, and Vitest.

- [ ] **Step 2: Add root layout and page shell**

Add `app/layout.tsx` with French metadata and a root `<html lang="fr">`. Add `app/page.tsx` as the main simulator page.

### Task 2: Add Lottery Data and Tests First

**Files:**
- Create: `src/data/teams.ts`
- Create: `src/lib/draft.test.ts`
- Create: `src/lib/draft.ts`

- [ ] **Step 1: Add team data**

Create a typed list of the 30 NBA teams with stable IDs and names.

- [ ] **Step 2: Write failing tests for fair shuffle invariants**

Test that `shuffleTeams` returns the same number of teams, preserves every team exactly once, and does not mutate the source array.

- [ ] **Step 3: Implement shuffleTeams**

Use a Fisher-Yates shuffle over a copied array.

- [ ] **Step 4: Run tests**

Run `pnpm test` and expect all shuffle tests to pass.

### Task 3: Build the Interactive UI

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Implement simulator state**

Use a client component with `draftOrder` and `lastRunAt` state. `Simuler la draft` sets a new shuffled order and timestamp. `Réinitialiser` clears both.

- [ ] **Step 2: Render result and team pool**

Show a primary ordered draft list and a secondary team list. Before simulation, show an empty-state message.

- [ ] **Step 3: Style responsive dashboard**

Use a bright restrained sports-dashboard style with stable button, panel, list, and mobile layouts.

### Task 4: Verify

**Files:**
- No new files expected.

- [ ] **Step 1: Run tests**

Run `pnpm test`.

- [ ] **Step 2: Run production build**

Run `pnpm build`.

- [ ] **Step 3: Run dev server and browser-check interaction**

Run `pnpm dev`, open the app, click `Simuler la draft`, confirm 30 unique rows appear, then click `Réinitialiser` and confirm the empty state returns.
