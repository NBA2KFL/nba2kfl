import Link from "next/link";
import { NBA_TEAMS } from "@/data/teams";
import { PRIMARY_APP_NAV_ITEMS } from "@/lib/navigation";
import { AppHeader } from "./_components/AppHeader";

export default function Home() {
  return (
    <main className="app-shell">
      <AppHeader
        activeHref="/"
        description="Accueil central pour lancer la lotterie ou consulter le board draft."
        eyebrow="NBA2KFL Draft Room"
        title="Accueil"
      />

      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-copy">
          <p className="section-label">Draft operations</p>
          <h2 id="home-title">Simule la lotterie, puis lis l'ordre de draft.</h2>
          <p>
            L'app est maintenant structurée autour de trois espaces: cette page
            d'accueil, la page Lotterie pour générer le tirage et la page Draft
            pour exploiter l'ordre complet.
          </p>

          <div className="home-actions" aria-label="Actions principales">
            {PRIMARY_APP_NAV_ITEMS.map((item) => (
              <Link className="home-action" href={item.href} key={item.href}>
                <strong>{item.ctaLabel}</strong>
                <span>{item.description}</span>
              </Link>
            ))}
          </div>
        </div>

        <aside className="home-scoreboard" aria-label="Résumé du simulateur">
          <div>
            <span>Teams</span>
            <strong>{NBA_TEAMS.length}</strong>
          </div>
          <div>
            <span>Mode</span>
            <strong>Fair draw</strong>
          </div>
          <div>
            <span>Pages</span>
            <strong>3</strong>
          </div>
          <div className="logo-strip" aria-hidden="true">
            {NBA_TEAMS.slice(0, 8).map((team) => (
              <img src={team.logoUrl} alt="" key={team.id} />
            ))}
          </div>
        </aside>
      </section>

      <section className="home-section-grid" aria-label="Structure de l'app">
        <div>
          <p className="section-label">Lotterie</p>
          <h2>Tirage équitable</h2>
          <p>
            Chaque franchise garde la même probabilité. Le résultat est
            sauvegardé localement pour être relu sur le board.
          </p>
        </div>
        <div>
          <p className="section-label">Draft</p>
          <h2>Board dédié</h2>
          <p>
            Les picks sont séparés entre lottery picks et reste du premier tour,
            avec logos, abréviations et conférence.
          </p>
        </div>
      </section>
    </main>
  );
}
