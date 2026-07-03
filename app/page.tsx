import Link from "next/link";
import { NBA_TEAMS } from "@/data/teams";
import { PRIMARY_APP_NAV_ITEMS } from "@/lib/navigation";
import { AppHeader } from "./_components/AppHeader";

export default function Home() {
  return (
    <main className="app-shell">
      <AppHeader
        activeHref="/"
        description="Accueil central pour lancer la lotterie et gérer le workflow NBA2KFL."
        eyebrow="NBA2KFL Draft Room"
        title="Accueil"
      />

      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-copy">
          <p className="section-label">Draft operations</p>
          <h2 id="home-title">Simule la lotterie, puis prépare la redraft.</h2>
          <p>
            L'app est structurée autour de la lotterie, de la sélection des
            franchises par les GMs et de la redraft joueurs en snake mode.
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
            <strong>4</strong>
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
            sauvegardé pour alimenter la suite du workflow.
          </p>
        </div>
        <div>
          <p className="section-label">Draft</p>
          <h2>Workflow GM</h2>
          <p>
            Les GMs choisissent leur franchise selon le rang tiré hors app,
            puis la redraft joueurs applique automatiquement l'ordre snake.
          </p>
        </div>
      </section>
    </main>
  );
}
