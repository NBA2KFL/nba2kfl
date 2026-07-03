# GM User Franchise Link Design

## Goal

Relier les comptes utilisateurs crees dans `neon_auth."user"` aux 30 rangs GM qui choisissent une franchise NBA, puis preparer la persistance serveur des franchises choisies.

## Approved Scope

- Creer une table metier `public.gm_draft_slots`.
- Inserer les 30 rangs existants de `DEFAULT_GM_DRAFT_ORDER`.
- Relier chaque rang a un utilisateur `neon_auth."user"`.
- Rattacher les rangs "2e equipe" au meme compte que le GM principal.
- Stocker la franchise choisie dans `team_id`, nullable tant que le choix n'est pas fait.
- Empecher deux rangs de choisir la meme franchise via une contrainte unique partielle sur `team_id`.
- Remplacer la persistance `localStorage` des franchises par une lecture/ecriture serveur.
- Garder le workflow redraft existant, mais le faire consommer les selections DB.

## GM Mapping

Les 30 rangs utilisent cette correspondance utilisateur :

| Rang | GM | Utilisateur |
| --- | --- | --- |
| 1 | Anna | Anna |
| 2 | Ellias | Ellias |
| 3 | Nico 2e equipe | Nico |
| 4 | Clem 2e equipe | Clem |
| 5 | Chris | Chris |
| 6 | Math | Mat Presti |
| 7 | Teepi | Teepi |
| 8 | Akuma | Akuma |
| 9 | Tony | Tony |
| 10 | Adito | Adito |
| 11 | Tamarlin | Tamarlin |
| 12 | Tamarlin 2e equipe | Tamarlin |
| 13 | Tony 2e equipe | Tony |
| 14 | Paul | Paul |
| 15 | Tomasninho | Tomasninho |
| 16 | Nico | Nico |
| 17 | Enzo | Enzo |
| 18 | Sam | Sam |
| 19 | ASL | ASL |
| 20 | Khaladan | Khaladan |
| 21 | Masai | Masai |
| 22 | Diane | Diane |
| 23 | Tidwa | Tidwa |
| 24 | Laiku | Laiku |
| 25 | Nortalis | Nortalis |
| 26 | Romback | Romback |
| 27 | Sparky | Sparky |
| 28 | Clem | Clem |
| 29 | Mat 2e equipe | Mat Presti |
| 30 | Naoufel | Naoufel |

## Data Model

`public.gm_draft_slots` stores one row per GM slot:

- `slot integer primary key`: rang de choix, 1 a 30.
- `gm_name text not null`: libelle affiche dans l'app.
- `user_id uuid not null`: reference vers `neon_auth."user"(id)`.
- `team_id text null`: id de franchise NBA choisie, compatible avec `src/data/teams.ts`.
- `created_at timestamptz not null default now()`.
- `updated_at timestamptz not null default now()`.

Constraints:

- `slot` unique by primary key.
- `user_id` foreign key to `neon_auth."user"(id)`.
- `team_id` unique when not null, so one NBA franchise can only be assigned once.

## Application Flow

The server creates or repairs the `gm_draft_slots` schema before reading or writing franchise slots. It seeds the 30 slots from a shared mapping, preserving existing `team_id` choices when the slot already exists.

The franchise page loads slots from the DB instead of browser `localStorage`. Updating a selected franchise writes the new `team_id` for that slot, and duplicate franchise assignments are rejected by validation plus the DB unique constraint.

The redraft page should use the same slot shape as today (`slot`, `gmName`, `teamId`), so the snake draft logic remains unchanged.

## Verification

- Unit tests cover the GM-to-user mapping, including second-team slots.
- DB helper tests cover schema creation, seeding, loading selections, and updating `team_id`.
- A DB verification query confirms 30 `gm_draft_slots` rows and 25 distinct linked users.
- `pnpm test` and `pnpm build` pass.
