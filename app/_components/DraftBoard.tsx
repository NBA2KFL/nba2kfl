"use client";

import Link from "next/link";
import type { Team } from "@/data/teams";
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
    <section className="lottery-panel draft-panel" aria-labelledby="draft-title">
      <div className="lottery-header">
        <div>
          <p className="section-label">Draft board</p>
          <h2 id="draft-title">Ordre complet de la draft</h2>
          <p className="lottery-copy">
            Le board reprend le dernier tirage enregistré. Tu peux aussi
            générer un nouvel ordre directement depuis cette page.
          </p>
        </div>

        <div className="lottery-actions" aria-label="Actions draft">
          <button
            className="primary-action"
            disabled={isLoading}
            onClick={runSimulation}
          >
            {isLoading ? "Connexion DB" : "Générer un ordre"}
          </button>
          <button
            className="secondary-action"
            disabled={!hasResult || isLoading}
            onClick={resetSimulation}
          >
            Réinitialiser
          </button>
          <Link className="tertiary-action" href="/lotterie">
            Retour lotterie
          </Link>
        </div>
      </div>

      <div className="summary-strip" aria-label="Résumé draft">
        <div>
          <span>Picks</span>
          <strong>{hasResult ? draftOrder.length : 0}/30</strong>
        </div>
        <div>
          <span>Lottery picks</span>
          <strong>{hasResult ? lotteryPicks.length : 0}</strong>
        </div>
        <div>
          <span>Dernier tirage</span>
          <strong>{formatRunDate(lastRunAt)}</strong>
        </div>
        <div>
          <span>Statut</span>
          <strong>
            {isLoading ? "Synchronisation DB" : hasResult ? "Board actif" : "En attente"}
          </strong>
        </div>
      </div>

      {error ? (
        <div className="error-state" role="alert">
          {error}
        </div>
      ) : null}

      {hasResult ? (
        <div className="draft-rounds">
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
        <div className="empty-state">
          <strong>Aucun ordre de draft</strong>
          <p>
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
    <section className="draft-round" aria-labelledby={`round-${startPick}`}>
      <div className="draft-round-heading">
        <h3 id={`round-${startPick}`}>{title}</h3>
        <span>{teams.length} picks</span>
      </div>
      <ol className="draft-pick-list">
        {teams.map((team, index) => (
          <li className="draft-pick-row" key={team.id}>
            <span className="pick-cell">{startPick + index}</span>
            <img src={team.logoUrl} alt="" className="team-logo" />
            <span className="draft-team-name">{team.name}</span>
            <strong>{team.abbreviation}</strong>
            <span>{team.conference}</span>
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
