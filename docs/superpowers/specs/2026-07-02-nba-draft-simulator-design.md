# NBA Draft Simulator Design

## Goal

Create a French Next.js app that simulates an NBA draft order with a simplified lottery. The first version uses a fair random draw: each team has the same chance and no official NBA lottery complexity is modeled.

## Approved Scope

- Single-page app in French.
- Preload the 30 current NBA teams with abbreviation, NBA team ID, and local logo path.
- Provide a `Simuler la draft` action that shuffles all teams into pick positions `#1` through `#30`.
- Provide a `Réinitialiser` action that clears the generated order.
- Show `30 équipes` and the last simulation time when a draw has been run.
- Use a Tankathon-inspired lottery table: compact rows, pick numbers, team logos, abbreviations, conference, and fair chance display.
- Use local SVG team logos downloaded from the NBA CDN under `public/logos/nba/`.
- Do not implement weighted odds, protected picks, trades, official lottery restrictions, or player images.

## User Experience

The app opens directly on the simulator, not a marketing landing page. The layout is a Tankathon-inspired operations screen: compact top navigation, green lottery action, summary strip, generated draft table as primary content, and an available-team panel as supporting context.

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
- `src/data/teams.ts`: typed NBA team list with local logo paths.
- `public/logos/nba/*.svg`: local NBA team logo assets.
- `src/lib/draft.ts`: fair random shuffle function.
- `src/lib/draft.test.ts`: shuffle behavior tests.
- `package.json`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`: project tooling.

## Verification

- `pnpm test` passes.
- `pnpm build` passes.
- Browser check confirms `Sim Lottery` generates 30 unique teams, logos load, and `Reset` returns the app to the initial order.
