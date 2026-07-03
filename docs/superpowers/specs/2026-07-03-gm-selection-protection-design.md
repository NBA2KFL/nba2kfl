# GM Selection Protection Design

## Goal

Proteger les choix de franchise et de joueurs pour que chaque GM connecte puisse modifier uniquement ses propres selections. Les autres selections restent visibles pour le suivi du workflow, mais elles ne sont pas modifiables par un GM non proprietaire.

## Approved Scope

- Ajouter Stack Auth au projet Next.js App Router.
- Utiliser `stackServerApp.getUser()` cote serveur pour identifier l'utilisateur courant.
- Mapper l'utilisateur Stack courant vers `neon_auth."user"` avec son email principal.
- Autoriser `PATCH /api/franchise-selections` seulement si le slot demande appartient au GM connecte.
- Retirer le reset global non protege de l'interface GM; aucune mutation globale n'est disponible sans role admin explicite.
- Persister les picks joueurs en base au lieu de les stocker uniquement dans `localStorage`.
- Autoriser un choix de joueur seulement si le pick appartient au slot GM du compte connecte.
- Garder la lecture globale des franchises et des picks pour afficher le board complet.

## Out Of Scope

- Gestion fine des roles admin.
- Draft timer temps reel ou verrou de pick courant.
- WebSocket, presence live, ou resolution automatique des conflits simultanes.
- Refonte visuelle majeure des pages draft.

## Authentication

Le projet utilisera Stack Auth avec l'integration officielle Next.js App Router:

- `@stackframe/stack` comme SDK applicatif.
- `stack/server.ts` avec `StackServerApp` et `tokenStore: "nextjs-cookie"`.
- `stack/client.ts` pour les hooks et composants client.
- `app/handler/[...stack]/page.tsx` pour les pages Stack de connexion, inscription et deconnexion.
- `app/layout.tsx` enveloppe l'application avec `StackProvider` et `StackTheme`.
- Les pages `/draft/franchises` et `/draft/redraft` protegent leur contenu avec `stackServerApp.getUser({ or: "redirect" })`.

Les variables d'environnement attendues sont:

- `NEXT_PUBLIC_STACK_PROJECT_ID`.
- `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY`.
- `STACK_SECRET_SERVER_KEY`.

## Current User Mapping

Un helper serveur extrait l'utilisateur courant via Stack Auth, lit son `primaryEmail`, puis retrouve le compte correspondant dans `neon_auth."user"` avec une comparaison email insensible a la casse. Si aucun utilisateur Stack n'est connecte, l'API renvoie `401`. Si l'utilisateur est connecte mais n'a aucun compte metier relie dans Neon, l'API renvoie `403`.

Le helper retourne une identite applicative minimale:

- `userId`: id UUID de `neon_auth."user"`.
- `email`: email normalise.
- `displayName`: libelle optionnel pour l'interface.

## Franchise Selection Authorization

La table existante `gm_draft_slots` contient deja `slot`, `gm_name`, `user_id` et `team_id`. Les mutations de franchise doivent utiliser `user_id` dans le `WHERE`:

- `PATCH` met a jour `team_id` uniquement pour `slot = $1 AND user_id = $currentUserId`.
- Si aucune ligne n'est modifiee, l'API renvoie `403` au lieu de masquer l'erreur en succes.
- La contrainte unique partielle sur `team_id` continue de bloquer deux franchises identiques.
- `GET` reste global et retourne aussi les informations necessaires a l'UI pour savoir quels slots sont editables par l'utilisateur courant.

Le bouton `Reinitialiser` est retire de l'interface GM pour eviter une suppression globale non autorisee. Aucune route de reset global n'est exposee dans cette iteration.

## Player Pick Persistence

Une nouvelle table `redraft_player_picks` stocke les choix joueurs:

- `pick_number integer primary key`: numero global du pick dans l'ordre snake courant.
- `slot integer not null references gm_draft_slots(slot)`: slot GM proprietaire du pick.
- `round integer not null`.
- `round_pick integer not null`.
- `player_name text not null`.
- `created_at timestamptz not null default now()`.
- `updated_at timestamptz not null default now()`.

Contraintes:

- `player_name` unique pour eviter qu'un joueur soit choisi deux fois.
- `slot` doit correspondre au slot calcule pour le `pick_number` au moment de la mutation.

L'API redraft expose:

- `GET /api/redraft-picks`: retourne les picks joueurs existants.
- `PATCH /api/redraft-picks`: recoit `{ pickNumber, playerName }`, recalcule le pick depuis les franchises assignees, verifie que le slot appartient au GM connecte, puis upsert ou supprime le joueur.

La liste des joueurs disponibles reste configurable dans l'UI et peut rester en `localStorage` pour cette iteration. La protection demandee porte sur l'action de selectionner un joueur, qui passe par l'API protegee.

## UI Behavior

La page Franchises affiche tous les GMs et franchises. Le select est actif seulement pour les slots appartenant a l'utilisateur courant. Les slots des autres GMs sont affiches en lecture seule.

La page Redraft affiche le board complet. Les selects de joueurs sont actifs seulement pour les picks du GM courant. Les autres picks restent visibles avec leur joueur selectionne ou leur etat libre.

Les erreurs serveur sont affichees dans les panneaux existants:

- `401`: redirection Stack ou message de session expiree.
- `403`: "Ce choix appartient a un autre GM."
- `409`: franchise ou joueur deja attribue.
- `500`: message base de donnees indisponible.

## Testing

Les changements doivent suivre TDD:

- Tests auth helper: utilisateur absent, email absent, utilisateur Neon introuvable, utilisateur valide.
- Tests DB franchises: update autorise par `user_id`, refus quand le slot appartient a un autre `user_id`.
- Tests API franchises: `401`, `403`, `409`, succes autorise.
- Tests DB redraft picks: schema, chargement, upsert autorise, suppression, joueur unique.
- Tests API redraft picks: refus non connecte, refus non proprietaire, succes proprietaire.
- Tests UI statiques ou composants: les controles non proprietaires sont desactives quand l'API indique qu'ils ne sont pas editables.
- Verification finale: `pnpm test` et `pnpm build`.

## References

- Stack Auth setup: https://docs.stack-auth.com/docs/getting-started/setup
- Stack Auth users and page protection: https://docs.stack-auth.com/docs/getting-started/users
