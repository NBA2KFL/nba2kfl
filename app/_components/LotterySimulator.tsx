"use client";

import Link from "next/link";
import { NBA_TEAMS } from "@/data/teams";
import { Button } from "@/components/ui/button";
import {
  DRAFT_LOTTERY_GENERATION_LOCKED,
  DRAFT_LOTTERY_LOCKED_MESSAGE,
  DRAFT_LOTTERY_VIEW_RESET_LOCKED
} from "@/lib/lottery-lock";
import { useDraftSimulation } from "./useDraftSimulation";

const FAIR_CHANCE_LABEL = "3,33 %";

export function LotterySimulator() {
  const {
    draftOrder,
    error,
    hasResult,
    isLoading,
    lastRunAt,
    resetSimulation,
    runSimulation
  } = useDraftSimulation();

  return (
    <section
      aria-labelledby="lottery-title"
      className="min-w-0 overflow-hidden rounded-[18px] border border-command-border bg-command-surface shadow-[0_18px_48px_rgba(16,24,40,0.08)]"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_232px] items-start gap-6 border-b border-command-border bg-command-surface p-5 max-[1040px]:grid-cols-1 max-[620px]:p-4">
        <div>
          <p className="mb-1 text-[0.64rem] font-[760] leading-none uppercase tracking-[0.14em] text-command-muted">
            Lotterie simplifiée
          </p>
          <h2
            className="mb-2 text-[1.33rem] font-[730] leading-[1.08] tracking-[-0.045em] text-command-ink max-[620px]:text-[1.18rem]"
            id="lottery-title"
          >
            2026 NBA Draft Lottery Simulator
          </h2>
          <p className="mb-0 max-w-[720px] text-[0.9rem] leading-[1.56] text-command-muted-strong max-[620px]:text-[0.88rem]">
            Tirage équitable: chaque franchise a la même chance d'obtenir
            n'importe quel rang. Le dernier résultat reste sauvegardé pour le
            workflow franchises et redraft.
          </p>
        </div>

        <div
          aria-label="Actions de tirage"
          className="grid w-full gap-2 max-[1040px]:grid-cols-3 max-[620px]:grid-cols-1"
        >
          <Button
            disabled={DRAFT_LOTTERY_GENERATION_LOCKED || isLoading}
            onClick={runSimulation}
          >
            {DRAFT_LOTTERY_GENERATION_LOCKED
              ? "Lotterie verrouillée"
              : isLoading
                ? "Connexion DB"
                : "Simuler la lotterie"}
          </Button>
          <Button
            disabled={DRAFT_LOTTERY_VIEW_RESET_LOCKED || !hasResult || isLoading}
            onClick={resetSimulation}
            variant="secondary"
          >
            Réinitialiser
          </Button>
          <Button asChild variant="tertiary">
            <Link href="/draft/franchises">Franchises</Link>
          </Button>
        </div>
      </div>

      <div
        aria-label="Résumé de la simulation"
        className="grid grid-cols-4 border-b border-command-border bg-command-surface-muted/55 max-[1040px]:grid-cols-2 max-[620px]:grid-cols-1"
      >
        <div className="min-h-[64px] border-r border-command-border px-4 py-3 max-[1040px]:border-b max-[1040px]:border-command-border max-[620px]:border-r-0">
          <span className="mb-1.5 block text-[0.64rem] font-[760] leading-none uppercase tracking-[0.13em] text-command-muted">
            Équipes
          </span>
          <strong className="text-[0.94rem] font-[720] leading-tight tracking-[-0.02em] text-command-ink">
            {NBA_TEAMS.length}
          </strong>
        </div>
        <div className="min-h-[64px] border-r border-command-border px-4 py-3 max-[1040px]:border-r-0 max-[1040px]:border-b max-[1040px]:border-command-border">
          <span className="mb-1.5 block text-[0.64rem] font-[760] leading-none uppercase tracking-[0.13em] text-command-muted">
            Chance
          </span>
          <strong className="text-[0.94rem] font-[720] leading-tight tracking-[-0.02em] text-command-ink">
            {FAIR_CHANCE_LABEL} chacune
          </strong>
        </div>
        <div className="min-h-[64px] border-r border-command-border px-4 py-3 max-[620px]:border-r-0 max-[620px]:border-b max-[620px]:border-command-border">
          <span className="mb-1.5 block text-[0.64rem] font-[760] leading-none uppercase tracking-[0.13em] text-command-muted">
            Dernier tirage
          </span>
          <strong className="text-[0.94rem] font-[720] leading-tight tracking-[-0.02em] text-command-ink">
            {formatRunDate(lastRunAt)}
          </strong>
        </div>
        <div className="min-h-[64px] px-4 py-3">
          <span className="mb-1.5 block text-[0.64rem] font-[760] leading-none uppercase tracking-[0.13em] text-command-muted">
            Statut
          </span>
          <strong className="text-[0.94rem] font-[720] leading-tight tracking-[-0.02em] text-command-ink">
            {DRAFT_LOTTERY_GENERATION_LOCKED
              ? "Verrouillée"
              : isLoading
                ? "Synchronisation DB"
                : hasResult
                  ? "Tirage généré"
                  : "Prêt"}
          </strong>
        </div>
      </div>

      {DRAFT_LOTTERY_GENERATION_LOCKED ? (
        <div
          className="border-b border-command-warning-border bg-command-warning-soft px-4 py-3 text-[0.86rem] font-[680] text-command-warning-text"
          role="status"
        >
          {DRAFT_LOTTERY_LOCKED_MESSAGE}
        </div>
      ) : null}

      {error ? (
        <div
          className="border-b border-command-red-border bg-command-red-soft px-4 py-3 text-[0.86rem] font-[680] text-command-red-text"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {hasResult ? (
        <div className="max-w-full overflow-x-auto">
          <table className="w-full border-collapse bg-command-surface max-[620px]:min-w-[560px]">
            <thead>
              <tr>
                <th
                  className="h-9 border-b border-command-border bg-command-surface-muted px-3.5 py-2.5 text-left text-[0.63rem] font-[760] tracking-[0.13em] text-command-muted uppercase"
                  scope="col"
                >
                  Pick
                </th>
                <th
                  className="h-9 border-b border-command-border bg-command-surface-muted px-3.5 py-2.5 text-left text-[0.63rem] font-[760] tracking-[0.13em] text-command-muted uppercase"
                  scope="col"
                >
                  Team
                </th>
                <th
                  className="h-9 border-b border-command-border bg-command-surface-muted px-3.5 py-2.5 text-left text-[0.63rem] font-[760] tracking-[0.13em] text-command-muted uppercase"
                  scope="col"
                >
                  Conf
                </th>
                <th
                  className="h-9 border-b border-command-border bg-command-surface-muted px-3.5 py-2.5 text-left text-[0.63rem] font-[760] tracking-[0.13em] text-command-muted uppercase"
                  scope="col"
                >
                  Chance
                </th>
              </tr>
            </thead>
            <tbody>
              {draftOrder.map((team, index) => (
                <tr
                  className="border-b border-command-border odd:bg-command-surface-muted/45 hover:bg-command-accent-soft/65 [&:nth-child(14)]:border-b-2 [&:nth-child(14)]:border-b-[rgba(94,106,210,0.42)]"
                  key={team.id}
                >
                  <td className="w-16 px-3.5 py-2.5 text-[0.98rem] font-[760] text-command-accent-dark">
                    {index + 1}
                  </td>
                  <td className="px-3.5 py-2.5">
                    <div className="flex min-w-[220px] items-center gap-2.5">
                      <img
                        alt=""
                        className="h-[28px] w-[28px] shrink-0 object-contain"
                        loading="lazy"
                        src={team.logoUrl}
                      />
                      <div>
                        <strong className="block text-[0.89rem] font-[690] leading-none tracking-[-0.015em] text-command-ink">
                          {team.name}
                        </strong>
                        <span className="mt-0.5 block text-[0.7rem] font-[690] text-command-muted">
                          {team.abbreviation}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5">{team.conference}</td>
                  <td className="px-3.5 py-2.5 font-[720] text-command-green-dark">
                    {FAIR_CHANCE_LABEL}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid min-h-[300px] content-center justify-items-center gap-2.5 p-8 text-center">
          <strong className="text-[1.04rem] font-[740] tracking-[-0.025em] text-command-ink">
            Aucun tirage lancé
          </strong>
          <p className="m-0 max-w-[470px] leading-[1.56] text-command-muted-strong">
            Lance une simulation pour générer les 30 positions, les sauvegarder
            en base et alimenter le workflow franchises.
          </p>
        </div>
      )}
    </section>
  );
}

function formatRunDate(date: Date | null) {
  if (!date) {
    return "Aucune simulation";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
