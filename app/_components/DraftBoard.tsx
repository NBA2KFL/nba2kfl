"use client";

import Link from "next/link";
import type { Team } from "@/data/teams";
import { Button } from "@/components/ui/button";
import {
  DRAFT_LOTTERY_GENERATION_LOCKED,
  DRAFT_LOTTERY_LOCKED_MESSAGE,
  DRAFT_LOTTERY_VIEW_RESET_LOCKED
} from "@/lib/lottery-lock";
import { useDraftSimulation } from "./useDraftSimulation";

export function DraftBoard() {
  const {
    draftOrder,
    error,
    hasResult,
    isLoading,
    lastRunAt,
    resetSimulation,
    runSimulation
  } = useDraftSimulation();
  const lotteryPicks = draftOrder.slice(0, 14);
  const remainingPicks = draftOrder.slice(14);

  return (
    <section
      aria-labelledby="draft-title"
      className="min-w-0 overflow-hidden rounded-[18px] border border-command-border bg-command-surface shadow-[0_18px_48px_rgba(16,24,40,0.08)]"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_232px] items-start gap-6 border-b border-command-border bg-command-surface p-5 max-[1040px]:grid-cols-1 max-[620px]:p-4">
        <div>
          <p className="mb-1 text-[0.64rem] font-[760] leading-none uppercase tracking-[0.14em] text-command-muted">
            Draft board
          </p>
          <h2
            className="mb-2 text-[1.33rem] font-[730] leading-[1.08] tracking-[-0.045em] text-command-ink max-[620px]:text-[1.18rem]"
            id="draft-title"
          >
            Ordre complet de la draft
          </h2>
          <p className="mb-0 max-w-[720px] text-[0.9rem] leading-[1.56] text-command-muted-strong max-[620px]:text-[0.88rem]">
            Le board reprend le dernier tirage enregistré. Tu peux aussi
            générer un nouvel ordre directement depuis cette page.
          </p>
        </div>

        <div
          aria-label="Actions draft"
          className="grid w-full gap-2 max-[1040px]:grid-cols-3 max-[620px]:grid-cols-1"
        >
          <Button
            disabled={DRAFT_LOTTERY_GENERATION_LOCKED || isLoading}
            onClick={runSimulation}
          >
            {DRAFT_LOTTERY_GENERATION_LOCKED
              ? "Génération bloquée"
              : isLoading
                ? "Connexion DB"
                : "Générer un ordre"}
          </Button>
          <Button
            disabled={DRAFT_LOTTERY_VIEW_RESET_LOCKED || !hasResult || isLoading}
            onClick={resetSimulation}
            variant="secondary"
          >
            Réinitialiser
          </Button>
          <Button asChild variant="tertiary">
            <Link href="/lotterie">Retour lotterie</Link>
          </Button>
        </div>
      </div>

      <div
        aria-label="Résumé draft"
        className="grid grid-cols-4 border-b border-command-border bg-command-surface-muted/55 max-[1040px]:grid-cols-2 max-[620px]:grid-cols-1"
      >
        <div className="min-h-[64px] border-r border-command-border px-4 py-3 max-[1040px]:border-b max-[1040px]:border-command-border max-[620px]:border-r-0">
          <span className="mb-1.5 block text-[0.64rem] font-[760] leading-none uppercase tracking-[0.13em] text-command-muted">
            Picks
          </span>
          <strong className="text-[0.94rem] font-[720] leading-tight tracking-[-0.02em] text-command-ink">
            {hasResult ? draftOrder.length : 0}/30
          </strong>
        </div>
        <div className="min-h-[64px] border-r border-command-border px-4 py-3 max-[1040px]:border-r-0 max-[1040px]:border-b max-[1040px]:border-command-border">
          <span className="mb-1.5 block text-[0.64rem] font-[760] leading-none uppercase tracking-[0.13em] text-command-muted">
            Lottery picks
          </span>
          <strong className="text-[0.94rem] font-[720] leading-tight tracking-[-0.02em] text-command-ink">
            {hasResult ? lotteryPicks.length : 0}
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
                  ? "Board actif"
                  : "En attente"}
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
        <div className="grid gap-3.5 p-4 max-[620px]:p-3">
          <DraftRound
            startPick={1}
            teams={lotteryPicks}
            title="Lottery picks"
          />
          <DraftRound
            startPick={15}
            teams={remainingPicks}
            title="Reste du premier tour"
          />
        </div>
      ) : (
        <div className="grid min-h-[300px] content-center justify-items-center gap-2.5 p-8 text-center">
          <strong className="text-[1.04rem] font-[740] tracking-[-0.025em] text-command-ink">
            Aucun ordre de draft
          </strong>
          <p className="m-0 max-w-[470px] leading-[1.56] text-command-muted-strong">
            Lance une simulation ici ou depuis la page Lotterie pour remplir le
            board.
          </p>
        </div>
      )}
    </section>
  );
}

function DraftRound({
  startPick,
  teams,
  title
}: {
  startPick: number;
  teams: Team[];
  title: string;
}) {
  return (
    <section
      aria-labelledby={`round-${startPick}`}
      className="overflow-hidden rounded-[14px] border border-command-border bg-command-surface"
    >
      <div className="flex items-center justify-between gap-3 border-b border-command-border bg-command-surface-muted px-3.5 py-2.5">
        <h3
          className="mb-0 text-[0.84rem] font-[720] text-command-ink"
          id={`round-${startPick}`}
        >
          {title}
        </h3>
        <span className="text-[0.72rem] font-[670] text-command-muted">
          {teams.length} picks
        </span>
      </div>
      <ol className="m-0 grid list-none p-0">
        {teams.map((team, index) => (
          <li
            className="grid min-h-[48px] grid-cols-[50px_32px_minmax(0,1fr)_56px_56px] items-center gap-2.5 border-b border-command-border px-3.5 py-2 last:border-b-0 odd:bg-command-surface-muted/45 hover:bg-command-accent-soft/65 max-[620px]:grid-cols-[42px_30px_minmax(120px,1fr)_48px]"
            key={team.id}
          >
            <span className="w-16 text-[0.98rem] font-[760] text-command-accent-dark">
              {startPick + index}
            </span>
            <img
              alt=""
              className="h-[28px] w-[28px] shrink-0 object-contain"
              src={team.logoUrl}
            />
            <span className="overflow-hidden text-ellipsis whitespace-nowrap font-[700] text-command-ink">
              {team.name}
            </span>
            <strong className="text-[0.76rem] font-[650] text-command-muted">
              {team.abbreviation}
            </strong>
            <span className="text-[0.76rem] font-[650] text-command-muted max-[620px]:hidden">
              {team.conference}
            </span>
          </li>
        ))}
      </ol>
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
