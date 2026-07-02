export type AppRoute = "/" | "/lotterie" | "/draft";

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
    href: "/draft",
    label: "Draft",
    description: "Consulte l'ordre complet généré par le dernier tirage.",
    ctaLabel: "Voir le board draft"
  }
] as const satisfies readonly AppNavItem[];

export const PRIMARY_APP_NAV_ITEMS = APP_NAV_ITEMS.filter(
  (item) => item.href !== "/"
);
