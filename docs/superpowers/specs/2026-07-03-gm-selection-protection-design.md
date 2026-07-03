# GM Selection Protection Design

## Goal

Proteger les choix de franchise et de joueurs pour que chaque GM connecte puisse modifier uniquement ses propres selections. Les autres selections restent visibles pour le suivi du workflow, mais elles ne sont pas modifiables par un GM non proprietaire.

## Approved Scope

- Ajouter Better Auth au projet Next.js App Router.
- Utiliser `auth.api.getSession({ headers })` cote serveur pour identifier l'utilisateur courant.
- Mapper l'utilisateur Better Auth courant vers `neon_auth."user"` avec son email.
- Autoriser `PATCH /api/franchise-selections` seulement si le slot demande appartient au GM connecte.
- Retirer le reset global non protege de l'interface GM; aucune mutation globale n'est disponible sans role admin explicite.
- Persister les picks joueurs en base au lieu de les stocker uniquement dans `localStorage`.
- Autoriser un choix de joueur seulement si le pick appartient au slot GM du compte connecte.
- Garder la lecture globale des franchises et des picks pour afficher le board complet.
- Ajouter un flux live adapte au serverless avec Server-Sent Events.
- Gerer la presence live des GMs connectes avec heartbeat persiste.
- Resoudre les conflits simultanes cote serveur avec transactions, contraintes DB et rafraichissement automatique client.

## Out Of Scope

- Gestion fine des roles admin.
- Draft timer temps reel ou verrou de pick courant.
- WebSocket permanent ou serveur stateful en memoire.
- Refonte visuelle majeure des pages draft.

## Authentication

Le projet utilisera Better Auth avec l'integration officielle Next.js App Router:

- `better-auth` comme SDK applicatif.
- `src/lib/auth.ts` configure Better Auth avec `pg.Pool`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` et `emailAndPassword`.
- `src/lib/auth-client.ts` expose le client React via `createAuthClient`.
- `app/api/auth/[...all]/route.ts` expose le handler Better Auth via `toNextJsHandler(auth)`.
- `app/sign-in/page.tsx` fournit une page email/mot de passe minimale pour connexion et creation de compte.
- Les pages `/draft/franchises` et `/draft/redraft` protegent leur contenu avec `auth.api.getSession({ headers: await headers() })`, puis redirigent vers `/sign-in` si aucune session n'existe.

Les variables d'environnement attendues sont:

- `DATABASE_URL`.
- `BETTER_AUTH_URL`.
- `BETTER_AUTH_SECRET`.

Les tables internes Better Auth doivent etre creees dans Postgres avant la premiere connexion/creation de compte. La migration schema Better Auth reste une operation explicite de deploiement et ne remplace pas les tables metier existantes `gm_draft_slots` et `neon_auth."user"`.

## Current User Mapping

Un helper serveur extrait l'utilisateur courant via Better Auth, lit `session.user.email`, puis retrouve le compte correspondant dans `neon_auth."user"` avec une comparaison email insensible a la casse. Si aucune session Better Auth n'est connectee, l'API renvoie `401`. Si l'utilisateur est connecte mais n'a aucun compte metier relie dans Neon, l'API renvoie `403`.

Le helper retourne une identite applicative minimale:

- `userId`: id UUID de `neon_auth."user"`.
- `email`: email normalise.
- `displayName`: libelle optionnel pour l'interface, derive de `session.user.name` ou de l'email.

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

## Live Updates With SSE

Le live utilise Server-Sent Events plutot que WebSocket, car l'app est hebergee en serverless. Le flux est unidirectionnel serveur vers client, avec mutations classiques en `PATCH`/`POST` pour les actions utilisateur.

Une table `draft_events` sert de journal append-only:

- `id bigint generated always as identity primary key`.
- `event_type text not null`: `franchise_selection_changed`, `redraft_pick_changed`, `presence_changed`, `conflict_resolved`.
- `payload jsonb not null`.
- `created_at timestamptz not null default now()`.

Chaque mutation autorisee ecrit son changement metier et insere un evenement dans la meme transaction. Le client ouvre `GET /api/draft-events` avec `EventSource`. La route SSE:

- authentifie l'utilisateur courant;
- retourne `Content-Type: text/event-stream`;
- lit `Last-Event-ID` ou un curseur initial;
- emet les evenements manquants;
- envoie des commentaires keepalive;
- ferme proprement apres 25 secondes, puis laisse `EventSource` reconnecter automatiquement.

Si la connexion SSE est interrompue, le client continue de fonctionner: les mutations restent HTTP, et la reconnexion reprend depuis le dernier id recu. Apres trois erreurs `EventSource` consecutives, le client active un refetch periodique toutes les 15 secondes jusqu'a la prochaine connexion SSE reussie.

## Live Presence

La presence est stockee dans `draft_presence`:

- `user_id uuid primary key references neon_auth."user"(id)`.
- `display_name text not null`.
- `active_page text not null`: `franchises` ou `redraft`.
- `active_slot integer null`.
- `last_seen_at timestamptz not null`.

Le client envoie un heartbeat `POST /api/draft-presence` toutes les 25 secondes et quand il change de page active. Le serveur considere un GM present si `last_seen_at` date de 60 secondes ou moins. Les changements de presence creent aussi des evenements SSE pour mettre a jour les badges "en ligne" sans recharger la page.

## Simultaneous Conflict Resolution

La base reste l'autorite unique. Les conflits sont resolus sans etat partage en memoire:

- Deux GMs choisissent la meme franchise: la contrainte unique `team_id` accepte la premiere transaction valide et la seconde renvoie `409` avec l'etat courant.
- Deux GMs choisissent le meme joueur: la contrainte unique `player_name` accepte la premiere transaction valide et la seconde renvoie `409` avec l'etat courant.
- Un GM modifie un pick qui a ete recalcule ou deplace: l'API recalcule le pick depuis les franchises assignees dans la transaction et refuse si le slot attendu ne correspond plus.
- Un client stale recoit un `409`, applique automatiquement l'etat serveur renvoye, puis affiche que le choix n'est plus disponible.

Chaque conflit insere un evenement `conflict_resolved` pour que les autres clients rafraichissent leurs options. Le client ne tente pas d'ecraser automatiquement le gagnant; il synchronise le board et demande au GM de choisir une option encore disponible.

## UI Behavior

La page Franchises affiche tous les GMs et franchises. Le select est actif seulement pour les slots appartenant a l'utilisateur courant. Les slots des autres GMs sont affiches en lecture seule.

La page Redraft affiche le board complet. Les selects de joueurs sont actifs seulement pour les picks du GM courant. Les autres picks restent visibles avec leur joueur selectionne ou leur etat libre.

Les deux pages affichent la presence des GMs actifs et se synchronisent via SSE apres chaque choix de franchise, choix de joueur, presence changee ou conflit resolu.

Les erreurs serveur sont affichees dans les panneaux existants:

- `401`: redirection Better Auth ou message de session expiree.
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
- Tests DB live: insertion d'evenements dans la meme transaction que les mutations et lecture par curseur.
- Tests API SSE: headers `text/event-stream`, reprise par `Last-Event-ID`, keepalive, refus non connecte.
- Tests presence: heartbeat, expiration des GMs inactifs, evenement `presence_changed`.
- Tests conflits: deux choix simultanes de meme franchise ou joueur produisent un gagnant unique, un `409` et un evenement `conflict_resolved`.
- Tests UI statiques ou composants: les controles non proprietaires sont desactives quand l'API indique qu'ils ne sont pas editables.
- Verification finale: `pnpm test` et `pnpm build`.

## References

- Better Auth Next.js integration: https://www.better-auth.com/docs/integrations/next
- Better Auth email/password: https://www.better-auth.com/docs/authentication/email-password
- Next.js Route Handlers streaming: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
