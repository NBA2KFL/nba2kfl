# NBA Draft Simulator Design

## Goal

Create a French Next.js app that simulates an NBA draft order with a simplified lottery. The first version uses a fair random draw: each team has the same chance and no official NBA lottery complexity is modeled.

## Approved Scope

- Single-page app in French.
- Preload the 30 current NBA teams as text data.
- Provide a `Simuler la draft` action that shuffles all teams into pick positions `#1` through `#30`.
- Provide a `Réinitialiser` action that clears the generated order.
- Show `30 équipes` and the last simulation time when a draw has been run.
- Do not implement weighted odds, protected picks, trades, official lottery restrictions, team logos, player images, or official NBA branding.

## User Experience

The app opens directly on the simulator, not a marketing landing page. The layout is a clean operations-style dashboard: controls and status at the top, the generated draft order as the primary content, and the available team pool as supporting context.

Before simulation, the draft order area explains that no draw has been run yet. After simulation, the order appears as a numbered list from first pick to last pick. Resetting returns the app to its initial state.

## Architecture

- Next.js App Router with TypeScript.
- Client-side state for the simulation result and last-run timestamp.
- Pure shuffle logic separated from React UI.
- Team data separated from UI code.
- Vitest tests for the shuffle behavior.

## Files

- `app/layout.tsx`: root layout and metadata.
- `app/page.tsx`: main simulator route.
- `app/globals.css`: global styling and responsive layout.
- `src/data/teams.ts`: typed NBA team list.
- `src/lib/draft.ts`: fair random shuffle function.
- `src/lib/draft.test.ts`: shuffle behavior tests.
- `package.json`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`: project tooling.

## Verification

- `pnpm test` passes.
- `pnpm build` passes.
- Manual browser check confirms `Simuler la draft` generates 30 unique teams and `Réinitialiser` clears the order.
