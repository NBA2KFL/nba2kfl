# NBA2KFL Suite Development Design

## Goal

Définir le cahier des charges de la suite du développement NBA2KFL: stabiliser le design dark/light, ajouter les profils utilisateurs, structurer la draft NBA 2K26 en snake order, générer les effectifs, gérer les franchises et trades, puis cadrer la R&D boxscores par journée de match.

La suite doit transformer l'app actuelle de draft/franchise en outil de gestion de ligue NBA2KFL, sans partir sur une refonte big bang. Le périmètre est complet, mais l'exécution doit rester découpée en lots testables.

## Existing Context

Le projet actuel est une app Next.js App Router avec TypeScript, Better Auth, Neon/Postgres et Vitest.

Fonctionnalités déjà présentes:

- Simulation de lotterie et sauvegarde du dernier tirage.
- Liste des 30 franchises NBA avec logos locaux.
- Sélection de franchises par rang GM via `gm_draft_slots`.
- Authentification Better Auth.
- Page de redraft snake, mais encore partiellement dépendante de `localStorage` pour le pool joueurs et les picks.
- Specs déjà existantes pour la liaison GM/utilisateur, la protection des choix GM et la refonte visuelle Linear ops room.

La suite doit réutiliser ces bases et éviter de dupliquer les concepts existants.

## Approved Product Direction

Tout le périmètre demandé est inclus:

- Ajuster le design en dark mode et light mode.
- Ajouter une gestion des profils utilisateurs.
- Mettre en place le système de draft joueurs en snake order.
- Avoir la database de tous les joueurs NBA 2K26.
- Réaliser une page profil avec gestion des franchises.
- Avoir un aperçu par effectif.
- Ajouter un système de trade sans validation dans l'app.
- Faire une R&D sur les boxscores par journée de match.

Le périmètre est découpé en 4 lots dépendants:

1. Socle produit: design, rôles, profils, page profil.
2. Draft NBA 2K26: import joueurs, snake draft persistante, effectifs générés.
3. Opérations franchise: gestion franchises, trades joueurs et picks, historique.
4. Matchday R&D: journées de match, imports boxscores, stats dérivées.

## Out Of Scope

- Validation de trades dans l'app. La validation métier se fait avant, sur Discord.
- API runtime dépendante d'une source externe de ratings NBA 2K26.
- Scraping automatique obligatoire de sites communautaires.
- Gestion salariale, salary cap, contrats ou exceptions NBA.
- IA de recommandation draft/trade.
- WebSocket stateful permanent.
- Gestion fine de rôles au-delà de `gm` et `admin`.

## Roles And Permissions

Deux rôles seulement:

- `gm`: utilisateur propriétaire d'une ou plusieurs franchises.
- `admin`: utilisateur qui administre les imports, profils, franchises, trades et boxscores.

Règles:

- Un GM peut consulter les profils, franchises, effectifs, draft board, trades et boxscores visibles.
- Un GM peut modifier uniquement les ressources qui lui appartiennent explicitement: ses informations de profil autorisées, ses picks draft si le pick lui appartient, et les vues liées à ses franchises.
- Un admin peut importer la base joueurs, ajuster les profils, rattacher les franchises, enregistrer les trades et importer les boxscores.
- Les mutations critiques passent toutes par API serveur, avec contrôle de session Better Auth et contrôle de rôle/propriété.

## Visual System

La direction visuelle existante "Linear ops room" reste le socle. L'interface doit rester dense, calme, lisible, orientée opérations.

### Light Mode

- Fond gris très clair.
- Surfaces blanches.
- Bordures fines.
- Accent indigo contrôlé.
- États positifs en vert, erreurs en rouge, warning en ambre.
- Tables compactes, filtres visibles, panels utilitaires.

### Dark Mode

- Fond principal proche `#0b0f15`.
- Surfaces `#111620` et `#151b26`.
- Bordures `#222937`.
- Texte principal proche blanc, texte secondaire gris bleuté.
- Même accent indigo pour actions, focus et pick courant.
- Les logos NBA restent lisibles sans imposer une palette d'équipe à l'app.

### Theme Behavior

Le thème utilise:

- préférence utilisateur stockée en base dans le profil;
- fallback sur préférence système si aucun choix n'existe;
- toggle accessible depuis le header ou la page profil;
- application serveur ou early client script pour éviter un flash de mauvais thème.

Les tokens CSS doivent être définis de façon symétrique pour light/dark afin d'éviter des classes dupliquées par thème.

## Navigation Target

Navigation cible:

- Accueil
- Profil
- Franchises
- Effectifs
- Draft
- Trades
- Matchdays
- Connexion

Les pages protégées redirigent vers `/sign-in` si aucune session n'est active. Les pages admin affichent un refus clair si un GM tente d'y accéder.

## Data Model

Les tables exactes pourront être raffinées pendant le plan d'implémentation, mais le modèle cible est le suivant.

### Existing Franchise Ownership Migration

La table existante `gm_draft_slots` reste la source de l'ordre initial de sélection des franchises. Elle ne doit pas devenir la seule source long terme de propriété des franchises, car elle mélange rang de draft GM et ownership franchise.

La suite doit donc prévoir une migration progressive:

1. continuer à lire `gm_draft_slots` pour l'ordre de sélection et la génération snake initiale;
2. créer ou alimenter `gm_franchises` quand une franchise est réellement attribuée;
3. faire de `gm_franchises` la source de vérité pour les profils, effectifs, trades et boxscores;
4. garder `gm_draft_slots` pour l'historique du rang de choix et les écrans de sélection franchise.

Cette séparation évite qu'un changement de propriétaire franchise casse l'historique de l'ordre de draft.

### `user_profiles`

Extension métier du compte Better Auth / Neon user:

- `user_id uuid primary key`: utilisateur métier lié.
- `role text not null`: `gm` ou `admin`.
- `display_name text not null`.
- `theme_preference text not null default 'system'`: `light`, `dark`, `system`.
- `avatar_initials text null`.
- `created_at timestamptz not null default now()`.
- `updated_at timestamptz not null default now()`.

### `gm_franchises`

Rattachement entre GM et franchise:

- `id uuid primary key`.
- `user_id uuid not null`.
- `team_id text not null`: id de `src/data/teams.ts`.
- `label text null`: exemple "Equipe principale" ou "2e équipe".
- `is_primary boolean not null default false`.
- `created_at timestamptz not null default now()`.
- `updated_at timestamptz not null default now()`.

Une franchise ne peut avoir qu'un seul propriétaire actif. Un GM peut avoir plusieurs franchises.

### `player_import_batches`

Journal des imports de joueurs:

- `id uuid primary key`.
- `source_name text not null`.
- `source_url text null`.
- `roster_version text not null`.
- `imported_by uuid not null`.
- `status text not null`: `validated`, `failed`, `applied`.
- `row_count integer not null`.
- `error_count integer not null`.
- `created_at timestamptz not null default now()`.

### `nba2k_players`

Base joueurs NBA 2K26 importée:

- `id uuid primary key`.
- `import_batch_id uuid not null`.
- `full_name text not null`.
- `normalized_name text not null`.
- `team_id text null`.
- `position text not null`.
- `secondary_position text null`.
- `overall integer not null`.
- `status text not null`: `active`, `free_agent`, `injured`, `unsigned`.
- `status_tags text[] not null default '{}'`.
- `source_player_id text null`.
- `created_at timestamptz not null default now()`.
- `updated_at timestamptz not null default now()`.

Le player pool inclut tous les joueurs NBA 2K26 importés: joueurs actifs, free agents, blessés et non signés. Ces statuts servent à filtrer, pas à exclure.

### `draft_picks`

Picks de redraft joueurs:

- `pick_number integer primary key`.
- `round integer not null`.
- `round_pick integer not null`.
- `slot integer not null`.
- `team_id text not null`.
- `user_id uuid not null`.
- `player_id uuid null`.
- `selected_at timestamptz null`.
- `selected_by uuid null`.
- `updated_at timestamptz not null default now()`.

Un joueur ne peut être sélectionné qu'une seule fois. Le `slot`, le `team_id` et le `user_id` sont dérivés de l'ordre snake au moment de la génération.

### `franchise_rosters`

L'effectif peut être une vue matérialisée ou une table dérivée:

- `team_id text not null`.
- `player_id uuid not null`.
- `acquisition_type text not null`: `draft`, `trade`.
- `acquired_at timestamptz not null`.
- `source_pick_number integer null`.
- `source_trade_id uuid null`.

La V1 peut calculer les rosters depuis `draft_picks` et `trades` plutôt que maintenir une table dupliquée, tant que les performances restent acceptables.

### `trades`

Enregistrement d'un trade déjà validé hors app:

- `id uuid primary key`.
- `recorded_by uuid not null`.
- `discord_reference text null`.
- `notes text null`.
- `status text not null default 'recorded'`.
- `created_at timestamptz not null default now()`.

### `trade_assets`

Assets inclus dans un trade:

- `id uuid primary key`.
- `trade_id uuid not null`.
- `from_team_id text not null`.
- `to_team_id text not null`.
- `asset_type text not null`: `player` ou `draft_pick`.
- `player_id uuid null`.
- `pick_label text null`.
- `pick_year integer null`.
- `pick_round integer null`.
- `original_team_id text null`.
- `protection_note text null`.
- `created_at timestamptz not null default now()`.

Chaque asset appartient à une seule franchise source et une seule franchise destination. Les trades peuvent inclure plusieurs joueurs et plusieurs picks de draft. En V1, les protections de pick sont stockées comme note descriptive; l'app n'applique pas automatiquement des règles complexes de protection.

### `matchdays`

Journées de match:

- `id uuid primary key`.
- `label text not null`.
- `scheduled_at date null`.
- `status text not null`: `draft`, `open`, `closed`.
- `created_by uuid not null`.
- `created_at timestamptz not null default now()`.

### `games`

Matchs d'une journée:

- `id uuid primary key`.
- `matchday_id uuid not null`.
- `home_team_id text not null`.
- `away_team_id text not null`.
- `home_score integer null`.
- `away_score integer null`.
- `status text not null`: `scheduled`, `played`, `imported`.

### `boxscore_imports`

Imports ou copier-coller de boxscores:

- `id uuid primary key`.
- `game_id uuid not null`.
- `imported_by uuid not null`.
- `raw_payload text not null`.
- `format text not null`: `csv`, `tsv`, `pasted_table`.
- `status text not null`: `validated`, `failed`, `applied`.
- `error_count integer not null`.
- `created_at timestamptz not null default now()`.

### `boxscore_lines`

Lignes statistiques par joueur et match:

- `id uuid primary key`.
- `game_id uuid not null`.
- `player_id uuid not null`.
- `team_id text not null`.
- `minutes text null`.
- `points integer not null default 0`.
- `rebounds integer not null default 0`.
- `assists integer not null default 0`.
- `steals integer not null default 0`.
- `blocks integer not null default 0`.
- `turnovers integer not null default 0`.
- `fgm integer null`.
- `fga integer null`.
- `three_pm integer null`.
- `three_pa integer null`.
- `ftm integer null`.
- `fta integer null`.

## Player Database Source Strategy

Aucune source officielle stable n'est prévue pour tous les joueurs NBA 2K26. Le cahier des charges retient donc l'import admin CSV comme source de vérité de l'app.

Le CSV doit inclure au minimum:

- `full_name`
- `team`
- `position`
- `overall`
- `status`
- `roster_version`

Colonnes optionnelles:

- `secondary_position`
- `source_player_id`
- attributs 2K additionnels si disponibles
- `source_url`

Validation attendue:

- nom joueur non vide;
- nom normalisé unique par import;
- équipe compatible avec les 30 franchises ou vide pour free agent/non signé;
- position reconnue;
- overall entier entre 0 et 99;
- statut reconnu;
- erreurs listées ligne par ligne avant application.

Une future R&D peut convertir une source communautaire en CSV, mais l'app ne doit pas dépendre de cette source à runtime.

## Snake Draft Behavior

Le système de draft joueurs utilise l'ordre des franchises assignées:

- round impair: ordre normal des slots;
- round pair: ordre inversé;
- le nombre de rounds est configurable par l'admin;
- la génération produit les lignes `draft_picks`;
- chaque pick connaît son GM, son slot et sa franchise;
- un GM ne peut sélectionner un joueur que sur un pick qui lui appartient;
- un admin peut corriger un pick si nécessaire;
- un joueur ne peut être choisi qu'une fois.

Le board doit afficher:

- pick global;
- round et pick dans le round;
- GM;
- franchise;
- joueur sélectionné;
- statut du pick;
- prochain pick courant.

## Profiles And Franchise Page

La page profil GM devient le hub individuel:

- identité du GM;
- rôle;
- franchises rattachées;
- franchise principale;
- aperçu des effectifs;
- picks de draft à venir ou passés;
- derniers trades liés;
- derniers boxscores liés quand le module R&D existe;
- préférence de thème.

La gestion des franchises doit permettre à l'admin:

- rattacher ou retirer une franchise à un GM;
- marquer une franchise principale;
- gérer les cas de deuxième équipe;
- voir les conflits de propriété;
- consulter l'état de draft et d'effectif par franchise.

## Rosters

La page Effectifs doit offrir un aperçu par franchise:

- liste des joueurs;
- position;
- overall;
- statut original 2K26;
- acquisition: draft ou trade;
- pick d'origine si drafté;
- trade d'origine si acquis;
- filtres par franchise, poste, rating, statut et GM;
- indicateurs: nombre de joueurs, OVR moyen, répartition par poste.

Les rosters sont la conséquence de la draft et des trades. Ils ne doivent pas être édités directement en V1, sauf correction admin documentée.

## Trades

Le trade system ne valide pas le trade. Il enregistre un trade décidé sur Discord.

Règles:

- seul un admin peut enregistrer un trade en V1;
- un trade peut inclure joueurs et picks;
- chaque asset a une franchise source et une franchise destination;
- l'app vérifie que le joueur appartient bien à la franchise source au moment de l'enregistrement;
- l'app vérifie qu'un pick échangé n'est pas déjà transféré de façon incompatible;
- chaque trade crée un historique consultable;
- un lien ou une référence Discord est optionnel mais recommandé;
- l'enregistrement d'un trade met à jour l'aperçu des effectifs.

Le formulaire de trade doit privilégier la clarté:

- bloc équipe A envoie;
- bloc équipe B envoie;
- ajout d'assets joueur ou pick;
- résumé final avant enregistrement;
- aucune étape "soumettre pour validation".

## Matchday Boxscores R&D

Le module boxscores est cadré comme R&D. La V1 cible un import/copie-collé admin, pas une saisie manuelle complète.

Flux:

1. Un admin crée une journée de match.
2. Un admin crée les matchs de la journée.
3. Après un match, l'admin colle ou importe le boxscore.
4. L'app parse le tableau.
5. L'app valide les colonnes minimales.
6. L'app affiche les erreurs ligne par ligne.
7. L'admin corrige les lignes invalides.
8. L'admin applique l'import.
9. Les stats deviennent visibles dans les pages matchday, joueur, franchise et profil.

Colonnes minimales:

- joueur;
- franchise;
- minutes;
- points;
- rebonds;
- passes;
- interceptions;
- contres;
- pertes de balle;
- tirs réussis/tentés;
- trois points réussis/tentés;
- lancers francs réussis/tentés.

La saisie manuelle complète d'un match est hors scope V1. Elle peut exister uniquement comme correction ligne par ligne.

## API Shape

Routes à prévoir:

- `GET /api/profile/me`
- `PATCH /api/profile/me`
- `GET /api/users`
- `PATCH /api/users/:id/profile`
- `GET /api/franchises`
- `PATCH /api/franchises/:teamId/owner`
- `POST /api/players/import/validate`
- `POST /api/players/import/apply`
- `GET /api/players`
- `POST /api/draft/generate`
- `GET /api/draft/picks`
- `PATCH /api/draft/picks/:pickNumber`
- `GET /api/rosters`
- `POST /api/trades`
- `GET /api/trades`
- `POST /api/matchdays`
- `GET /api/matchdays`
- `POST /api/games/:gameId/boxscore/validate`
- `POST /api/games/:gameId/boxscore/apply`

Le plan d'implémentation pourra ajuster les routes selon les conventions du repo, mais les responsabilités doivent rester séparées.

## UI Behavior

### Profil

Le profil doit ouvrir sur les informations utiles au GM:

- qui je suis;
- quelles franchises je gère;
- où en est ma draft;
- à quoi ressemble mon effectif;
- quels mouvements récents me concernent.

### Draft

La draft est un workspace dense:

- colonne gauche: filtres joueurs;
- zone centrale: board des picks;
- panneau droit: détails du joueur ou pick courant;
- état disabled clair pour les picks non propriétaires.

### Effectifs

La page Effectifs doit permettre de comparer rapidement les franchises. Le tableau est prioritaire sur les cartes décoratives.

### Trades

L'interface doit rendre impossible l'ambiguïté sur le sens du mouvement. Chaque asset doit clairement afficher "de" et "vers".

### Matchdays

La R&D doit privilégier la validation de format et la visualisation des erreurs plutôt que l'esthétique.

## Error Handling

Réponses attendues:

- `401`: utilisateur non connecté;
- `403`: rôle insuffisant ou ressource non propriétaire;
- `404`: ressource inexistante;
- `409`: conflit de draft, joueur déjà choisi, franchise déjà propriétaire, trade incompatible;
- `422`: import invalide avec erreurs ligne par ligne;
- `500`: base de données indisponible.

Les erreurs d'import doivent inclure:

- numéro de ligne;
- nom de colonne;
- valeur reçue;
- message de correction.

## Audit And Events

Les actions suivantes doivent écrire un événement d'audit:

- changement de rôle;
- changement de propriétaire de franchise;
- import joueurs appliqué;
- génération ou régénération de draft;
- sélection ou correction d'un pick;
- enregistrement de trade;
- import boxscore appliqué.

La table existante `draft_events` peut être généralisée ou complétée par une table `audit_events`.

## Testing And Verification

Chaque lot doit être vérifié séparément.

### Lot 1

- Tests helper profil et rôle.
- Tests API profil.
- Tests thème light/dark et préférence.
- Vérification visuelle desktop/mobile.

### Lot 2

- Tests parse/validation CSV joueurs.
- Tests application import.
- Tests génération snake draft.
- Tests ownership picks.
- Tests unicité joueur drafté.

### Lot 3

- Tests création trade joueurs.
- Tests création trade picks.
- Tests refus asset incompatible.
- Tests recalcul roster après trade.
- Tests historique.

### Lot 4

- Tests parsing boxscore.
- Tests validation colonnes.
- Tests erreurs ligne par ligne.
- Tests application import.
- Tests agrégations simples.

Commandes finales attendues:

- `pnpm test`
- `pnpm build`

## Delivery Order

Ordre recommandé:

1. Finaliser le design dark/light et préférences profil.
2. Ajouter `user_profiles` et les permissions `gm`/`admin`.
3. Créer la page Profil et le rattachement franchises.
4. Créer l'import joueurs NBA 2K26.
5. Persister et protéger la draft joueurs.
6. Générer les aperçus d'effectifs.
7. Ajouter les trades joueurs + picks.
8. Ajouter l'historique/audit.
9. Prototyper matchdays et import boxscores.
10. Raffiner les stats dérivées après retour réel d'utilisation.

## References

- NBA 2K26 Top 100 and attribute lists: https://as.com/meristation/noticias/estos-son-los-100-mejores-jugadores-de-nba-2k26-y-los-mejores-triplistas-defensores-pivots-espanoles-n/
- NBA 2K26 Top 100 coverage mentioning official release: https://www.netsdaily.com/nets-analysis/98279/only-one-brooklyn-net-makes-nba-2k26-top-100-ratings
- Team/player ratings coverage referencing 2KRatings as a community source: https://www.postingandtoasting.com/knicks-analysis/73347/nba-2k26-ratings-revealed-where-the-knicks-stack-up
