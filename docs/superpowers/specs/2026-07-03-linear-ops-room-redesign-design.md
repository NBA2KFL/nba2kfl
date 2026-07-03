# Linear Ops Room Redesign Design

## Goal

Revisiter le design de l'app NBA2KFL en s'inspirant de la direction artistique de Linear: interface produit calme, dense, lisible, avec surfaces fines, typographie stricte et accents controles. La refonte doit moderniser toutes les pages visibles sans changer le workflow metier.

## Approved Direction

La direction retenue est "Linear ops room pour NBA2KFL":

- Fond gris tres clair, panneaux blancs, bordures fines et ombres quasi invisibles.
- Typographie systeme plus precise, tailles compactes et meilleure hierarchie.
- Navigation produit sobre, avec tabs discrets et etat actif net.
- Accent principal indigo/violet inspire de Linear pour les actions et selections.
- Vert reserve aux etats positifs; rouge reserve aux erreurs.
- Identite NBA2KFL conservee par les logos NBA, les contenus draft et le marquage `N2K`.

## Scope

- Reprendre le systeme visuel global dans `app/globals.css`.
- Ajuster legerement `AppHeader` si necessaire pour ameliorer la structure du header sans changer sa responsabilite.
- Ajuster legerement `app/page.tsx` si necessaire pour rendre l'accueil plus proche d'un centre operationnel.
- Appliquer la meme direction aux pages Accueil, Lotterie, Franchises, Redraft et Connexion.
- Garder les composants existants, les routes existantes, les appels API existants et les textes fonctionnels existants sauf correction de casse ou de clarte UI mineure.

## Out Of Scope

- Changement de logique draft, lotterie, auth ou persistance.
- Ajout de bibliotheque UI, icones ou fonts externes.
- Ajout de mode sombre.
- Refonte du modele de navigation ou creation d'une sidebar.
- Refonte marketing ou hero plein ecran.
- Reprise des protections GM prevues dans une autre spec.

## Visual System

Tokens proposes:

- `--background`: `#f7f8fb`.
- `--surface`: `#ffffff`.
- `--surface-muted`: `#f3f4f8`.
- `--table-head`: `#f7f7fa`.
- `--text`: `#111827`.
- `--muted`: `#6b7280`.
- `--border`: `#e5e7ef`.
- `--accent`: `#5e6ad2`.
- `--accent-dark`: `#4f56c8`.
- `--accent-soft`: `#eef0ff`.
- `--green`: `#10b981`.
- `--red`: `#ef4444`.
- `--shadow`: ombre courte et subtile, presque plate.

La palette reste volontairement froide et claire. Elle ne doit pas devenir un theme NBA colore; les couleurs NBA restent portees par les logos.

## Layout

L'app garde son shell central en largeur maximale, mais avec plus d'air autour des blocs et une densite interne plus proche d'un outil produit:

- Header commun en surface blanche, rayon 8px, bordure fine, contenu compacte.
- Navigation en tabs legers, sans effet bouton massif.
- Panels principaux avec bordure fine, pas de grosse ombre.
- Summary strips plus calmes, separes par des bordures et des fonds tres legers.
- Tables et listes conservees comme surfaces principales, avec lignes plus fines et hover subtil.
- Mobile: conserver les grilles existantes qui se replient en une colonne, avec padding reduit et tabs qui wrap proprement.

## Components

### Header

Le `N2K` devient un marqueur plus proche d'un app icon: carre sombre ou accent, taille compacte, texte net. Le titre de page reste visible, mais les descriptions deviennent moins dominantes.

### Actions

Les actions principales passent en indigo, avec boutons sentence case, hauteur plus compacte et focus visible. Les actions secondaires gardent un fond clair et une bordure fine. Les boutons desactives restent lisibles sans attirer l'attention.

### Tables And Rows

Les tables conservent leur structure actuelle. Les pick numbers deviennent un signal accentue plus fin, les headers sont plus discrets, les lignes alternent moins fortement, et l'etat courant utilise une barre ou un fond `accent-soft`.

### Forms

Inputs, selects et textarea partagent une apparence unique: rayon 6px, bordure fine, fond blanc, focus indigo. Les champs de connexion utilisent les memes styles que les controles draft.

### States

Les erreurs et verrous restent visibles mais moins bruyants:

- Erreur: rouge doux, bordure rouge claire.
- Verrou: jaune/ambre doux.
- Empty state: centre, copie courte, aucune decoration supplementaire.

## Page-Specific Behavior

### Accueil

L'accueil devient un dashboard d'orientation compact: actions principales en modules operationnels, resume a droite, logos en support. Pas de hero marketing.

### Lotterie And Draft

Le simulateur reste la surface dominante. Le bouton de simulation est l'action principale. La table et les listes restent le centre visuel.

### Franchises

Le board garde son role de workflow GM. L'etat du prochain choix doit etre lisible rapidement via l'accent indigo.

### Redraft

Les controles restent a gauche sur desktop et au-dessus sur mobile. Le pick courant doit etre visible sans rendre les autres lignes illisibles.

### Connexion

Le panneau auth devient plus compact et coherent avec les forms de l'app. Aucun changement de flow Better Auth.

## Data Flow

La refonte ne modifie pas les donnees ni les appels reseau:

- `useDraftSimulation` reste inchange.
- Les routes API restent inchangees.
- Les pages protegees par Better Auth restent inchangees.
- Les controles continuent a emettre les memes actions React.

## Error Handling

Les messages d'erreur existants restent affiches aux memes endroits. La refonte change seulement leur presentation visuelle. Les erreurs doivent rester accessibles via `role="alert"` quand le composant le fait deja.

## Testing And Verification

Verification attendue:

- `pnpm test`.
- `pnpm build`.
- Lancer le serveur local et verifier au moins Accueil, Lotterie et Connexion.
- Si possible, verifier une page protegee avec un compte local existant.
- Captures desktop et mobile pour controler absence d'overflow, lisibilite des tables, et coherence des boutons/forms.

## Implementation Notes

La modification doit rester principalement CSS. Les changements JSX sont acceptes seulement s'ils ameliorent une structure visuelle sans changer le comportement. Les selectors doivent rester compatibles avec les tests existants et les composants actuels.
