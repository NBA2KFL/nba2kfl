import Link from "next/link";
import { NBA_TEAMS } from "@/data/teams";
import { PRIMARY_APP_NAV_ITEMS } from "@/lib/navigation";

export default function Home() {
  return (
    <>
      <section
        aria-labelledby="home-title"
        className="relative mt-4 grid min-w-0 grid-cols-[minmax(0,1fr)_300px] gap-0 overflow-hidden rounded-[18px] border border-command-border bg-command-surface shadow-[0_18px_48px_rgba(16,24,40,0.08)] max-[1040px]:grid-cols-1"
      >
        <div className="border-r border-command-border p-7 max-[1040px]:border-r-0 max-[1040px]:border-b max-[1040px]:border-command-border max-[620px]:p-4">
          <p className="mb-1 text-[0.64rem] font-[760] leading-none uppercase tracking-[0.14em] text-command-muted">
            Draft operations
          </p>
          <h2
            className="mb-4 max-w-[780px] text-[clamp(2.25rem,4.6vw,4.65rem)] font-[760] leading-[0.91] tracking-[-0.075em] text-command-ink max-[620px]:text-[clamp(2rem,11.5vw,3rem)] max-[620px]:tracking-[-0.065em]"
            id="home-title"
          >
            Simule la lotterie, puis prépare la redraft.
          </h2>
          <p className="mb-6 max-w-[660px] text-[1rem] leading-[1.58] text-command-muted-strong">
            L'app est structurée autour de la lotterie, de la sélection des
            franchises par les GMs et de la redraft joueurs en snake mode.
          </p>

          <div
            aria-label="Actions principales"
            className="grid grid-cols-3 gap-2.5 max-[1040px]:grid-cols-2 max-[620px]:grid-cols-1"
          >
            {PRIMARY_APP_NAV_ITEMS.map((item) => (
              <Link
                className="relative grid min-h-[128px] content-between gap-4 rounded-[14px] border border-command-border bg-command-surface-muted/55 p-4 transition duration-150 ease-out hover:-translate-y-0.5 hover:border-command-border-strong hover:bg-command-surface hover:shadow-[0_14px_30px_rgba(16,24,40,0.08)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[rgba(94,106,210,0.22)] max-[620px]:min-h-[110px]"
                href={item.href}
                key={item.href}
              >
                <strong className="text-[0.98rem] font-[720] tracking-[-0.02em] text-command-ink">
                  {item.ctaLabel}
                </strong>
                <span className="text-[0.84rem] leading-[1.48] text-command-muted-strong">
                  {item.description}
                </span>
                <span aria-hidden className="h-0.5 w-8 rounded-full bg-command-accent" />
              </Link>
            ))}
          </div>
        </div>

        <aside
          aria-label="Résumé du simulateur"
          className="grid content-start gap-0 bg-command-surface-muted/70 p-0"
        >
          <div className="grid min-h-[86px] gap-1 border-b border-command-border px-5 py-4 max-[620px]:min-h-[74px] max-[620px]:px-4 max-[620px]:py-3.5">
            <span className="text-[0.64rem] font-[760] leading-none uppercase tracking-[0.13em] text-command-muted">
              Teams
            </span>
            <strong className="text-[1.18rem] font-[760] tracking-[-0.03em] text-command-ink">
              {NBA_TEAMS.length}
            </strong>
          </div>
          <div className="grid min-h-[86px] gap-1 border-b border-command-border px-5 py-4 max-[620px]:min-h-[74px] max-[620px]:px-4 max-[620px]:py-3.5">
            <span className="text-[0.64rem] font-[760] leading-none uppercase tracking-[0.13em] text-command-muted">
              Mode
            </span>
            <strong className="text-[1.18rem] font-[760] tracking-[-0.03em] text-command-ink">
              Fair draw
            </strong>
          </div>
          <div className="grid min-h-[86px] gap-1 border-b border-command-border px-5 py-4 max-[620px]:min-h-[74px] max-[620px]:px-4 max-[620px]:py-3.5">
            <span className="text-[0.64rem] font-[760] leading-none uppercase tracking-[0.13em] text-command-muted">
              Pages
            </span>
            <strong className="text-[1.18rem] font-[760] tracking-[-0.03em] text-command-ink">
              4
            </strong>
          </div>
          <div
            aria-hidden="true"
            className="grid grid-cols-4 gap-2.5 p-5 max-[620px]:p-4"
          >
            {NBA_TEAMS.slice(0, 8).map((team) => (
              <img
                alt=""
                className="h-[34px] w-full object-contain saturate-[1.04]"
                key={team.id}
                src={team.logoUrl}
              />
            ))}
          </div>
        </aside>
      </section>

      <section
        aria-label="Structure de l'app"
        className="mt-4 grid grid-cols-2 gap-4 max-[620px]:grid-cols-1"
      >
        <div className="min-w-0 rounded-[16px] border border-command-border bg-command-surface p-5 shadow-[0_18px_48px_rgba(16,24,40,0.08)]">
          <p className="mb-1 text-[0.64rem] font-[760] leading-none uppercase tracking-[0.14em] text-command-muted">
            Lotterie
          </p>
          <h2 className="mb-2 text-[1.18rem] font-[720] tracking-[-0.035em] text-command-ink">
            Tirage équitable
          </h2>
          <p className="mb-0 leading-[1.56] text-command-muted-strong">
            Chaque franchise garde la même probabilité. Le résultat est
            sauvegardé pour alimenter la suite du workflow.
          </p>
        </div>
        <div className="min-w-0 rounded-[16px] border border-command-border bg-command-surface p-5 shadow-[0_18px_48px_rgba(16,24,40,0.08)]">
          <p className="mb-1 text-[0.64rem] font-[760] leading-none uppercase tracking-[0.14em] text-command-muted">
            Draft
          </p>
          <h2 className="mb-2 text-[1.18rem] font-[720] tracking-[-0.035em] text-command-ink">
            Workflow GM
          </h2>
          <p className="mb-0 leading-[1.56] text-command-muted-strong">
            Les GMs choisissent leur franchise selon le rang tiré hors app,
            puis la redraft joueurs applique automatiquement l'ordre snake.
          </p>
        </div>
      </section>
    </>
  );
}
