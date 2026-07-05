import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { APP_NAV_ITEMS, type AppRoute } from "@/lib/navigation";

type AppHeaderProps = {
  activeHref: AppRoute;
  eyebrow: string;
  title: string;
  description?: string;
};

export function AppHeader({
  activeHref,
  eyebrow,
  title,
  description
}: AppHeaderProps) {
  return (
    <header className="site-header" aria-labelledby="page-title">
      <div className="brand-lockup">
        <Link className="brand-mark" href="/" aria-label="Retour à l'accueil">
          N2K
        </Link>
        <div>
          <p className="section-label">{eyebrow}</p>
          <h1 id="page-title">{title}</h1>
          {description ? <p className="header-copy">{description}</p> : null}
        </div>
      </div>

      <div className="header-actions">
        <nav className="top-tabs" aria-label="Navigation principale">
          {APP_NAV_ITEMS.map((item) => (
            <Link
              aria-current={item.href === activeHref ? "page" : undefined}
              className={`top-tab${item.href === activeHref ? " is-active" : ""}`}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
