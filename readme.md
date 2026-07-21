# NBA2KFL Draft Room

NBA2KFL Draft Room is a French Next.js application for running the NBA2KFL draft workflow: fair franchise lottery, GM franchise assignment, snake player redraft, franchise ownership management, and Discord-ready draft notifications.

The app is built as an operations room for league admins and GMs. It uses local NBA team assets, Better Auth for email/password sign-in, Neon/Postgres for persistence, and Vitest for the test suite.

## Features

- Fair 30-team lottery simulation with local NBA logos.
- Persistent latest lottery result in Postgres.
- GM draft slot seeding from the configured NBA2KFL draft order.
- Franchise selection view for assigning NBA teams to GM slots.
- Locked franchise-selection API for the finalized draft state.
- Snake redraft board generated from assigned franchises.
- Authenticated redraft pick mutations with GM ownership checks and admin override.
- NBA 2K26 roster import from the configured NBA2K roster source.
- NBA player media ID sync for Discord and player visuals.
- Franchise owner management for long-term franchise ownership.
- Discord webhook notifications for redraft picks and round recaps.
- Light/dark theme support.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Better Auth
- Neon serverless Postgres and `pg`
- Vitest
- Radix UI primitives
- Lucide React icons

## App Routes

- `/` - home dashboard for the draft workflow.
- `/lotterie` - fair lottery simulator.
- `/draft/franchises` - GM franchise selection board.
- `/draft/redraft` - snake player redraft room.
- `/franchises` - franchise owner management.
- `/sign-in` - GM/admin sign-in.

## Requirements

- Node.js with Corepack enabled.
- pnpm.
- A Postgres database compatible with Neon Auth schemas.

## Setup

Install dependencies:

```bash
pnpm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Configure the values:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="replace-with-a-random-secret-at-least-32-characters-long"
ADMIN_EMAILS="admin@nba2kfl.local"
DISCORD_DRAFT_WEBHOOK_URL=""
```

Optional roster/media variables:

```bash
NBA2K_ROSTER_SOURCE_URL="https://www.nba2klab.com/.netlify/functions/player-roster"
NBA_STATS_SEASON="2025-26"
```

Run the development server:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm test
pnpm sync:nba2k26-rosters
pnpm sync:nba-player-ids
```

Additional operational scripts:

```bash
node scripts/ensure-gm-auth-users.mjs
node --no-warnings --experimental-strip-types scripts/link-better-auth-users.ts --dry-run
node --no-warnings --experimental-strip-types scripts/link-better-auth-users.ts
```

`ensure-gm-auth-users.mjs` creates the configured GM accounts when they are missing and writes generated passwords to `.env.user-passwords.md`.

## Database Behavior

The app creates required tables lazily from server routes and scripts. Important tables include:

- `draft_simulations` - latest lottery payload and timestamp.
- `gm_draft_slots` - fixed GM slot order and selected franchise per slot.
- `gm_franchises` - long-term franchise ownership.
- `nba2k_roster_players` - imported NBA 2K26 roster pool.
- `redraft_picks` - validated snake redraft picks.
- draft event and recap tables used for live updates and Discord recaps.

The source GM slot order and finalized franchise selections live in `src/lib/redraft.ts`.

## API Overview

- `GET/POST/DELETE /api/draft-simulation`
- `GET/PATCH/DELETE /api/franchise-selections`
- `GET/PATCH/DELETE /api/redraft-picks`
- `GET /api/draft-events`
- `GET /api/players`
- `GET /api/franchises`
- `PATCH /api/franchises/[teamId]/owner`
- `POST /api/redraft-picks/notifications`
- `POST /api/redraft-picks/notifications/recap`
- `GET /api/discord-media/player/[nbaPlayerId]`
- `GET /api/discord-media/team/[nbaTeamId]`

## Development Notes

- UI text is primarily French.
- NBA logos are stored locally in `public/logos/nba/`.
- The redraft uses 14 snake rounds by default.
- Franchise selection mutations are currently locked in the API after finalization.
- Admin access is controlled by the comma-separated `ADMIN_EMAILS` environment variable.
- Discord notifications require `DISCORD_DRAFT_WEBHOOK_URL`.
- The NBA player silhouette fallback is served from `public/images/player-silhouette.svg`.

## Verification

Run the test suite:

```bash
pnpm test
```

Build the app:

```bash
pnpm build
```
