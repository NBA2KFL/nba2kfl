export type AppRoute =
  | "/"
  | "/lotterie"
  | "/draft/franchises"
  | "/draft/redraft"
  | "/franchises"
  | "/sign-in";

export type AppNavItem = {
  href: AppRoute;
  label: string;
  description: string;
  ctaLabel: string;
};

export const APP_NAV_ITEMS = [
  {
    href: "/",
    label: "Accueil",
    description: "Vue principale du simulateur NBA2KFL.",
    ctaLabel: "Retour accueil"
  },
  {
    href: "/lotterie",
    label: "Lotterie",
    description: "Lance un tirage équitable entre les 30 franchises NBA.",
    ctaLabel: "Ouvrir la lotterie"
  },
  {
    href: "/draft/franchises",
    label: "Franchises",
    description: "Attribue les franchises NBA selon l'ordre tiré au sort hors app.",
    ctaLabel: "Choisir les franchises"
  },
  {
    href: "/draft/redraft",
    label: "Redraft",
    description: "Effectue la draft joueurs avec un ordre snake.",
    ctaLabel: "Lancer la redraft"
  },
  {
    href: "/franchises",
    label: "Gestion",
    description: "Administre les propriétaires long terme des franchises.",
    ctaLabel: "Gérer les propriétaires"
  },
  {
    href: "/sign-in",
    label: "Connexion",
    description: "Connecte ton compte GM.",
    ctaLabel: "Se connecter"
  }
] as const satisfies readonly AppNavItem[];

export const PRIMARY_APP_NAV_ITEMS = APP_NAV_ITEMS.filter(
  (item) => item.href !== "/" && item.href !== "/sign-in"
);
