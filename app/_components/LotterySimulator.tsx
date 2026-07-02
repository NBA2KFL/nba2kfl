"use client";

import Link from "next/link";
import { NBA_TEAMS } from "@/data/teams";
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
    <section className="lottery-panel" aria-labelledby="lottery-title">
      <div className="lottery-header">
        <div>
          <p className="section-label">Lotterie simplifiée</p>
          <h2 id="lottery-title">2026 NBA Draft Lottery Simulator</h2>
          <p className="lottery-copy">
            Tirage équitable: chaque franchise a la même chance d'obtenir
            n'importe quel rang. Le dernier résultat est partagé avec la page
            Draft.
          </p>
        </div>

        <div className="lottery-actions" aria-label="Actions de tirage">
          <button
            className="primary-action"
            disabled={isLoading}
            onClick={runSimulation}
          >
            {isLoading ? "Connexion DB" : "Simuler la lotterie"}
          </button>
          <button
            className="secondary-action"
            disabled={!hasResult || isLoading}
            onClick={resetSimulation}
          >
            Réinitialiser
          </button>
          <Link className="tertiary-action" href="/draft">
            Voir la draft
          </Link>
        </div>
      </div>

      <div className="summary-strip" aria-label="Résumé de la simulation">
        <div>
          <span>Équipes</span>
          <strong>{NBA_TEAMS.length}</strong>
        </div>
        <div>
          <span>Chance</span>
          <strong>{FAIR_CHANCE_LABEL} chacune</strong>
        </div>
        <div>
          <span>Dernier tirage</span>
          <strong>{formatRunDate(lastRunAt)}</strong>
        </div>
        <div>
          <span>Statut</span>
          <strong>
            {isLoading ? "Synchronisation DB" : hasResult ? "Tirage généré" : "Prêt"}
          </strong>
        </div>
      </div>

      {error ? (
        <div className="error-state" role="alert">
          {error}
        </div>
      ) : null}

      {hasResult ? (
        <div className="draft-table-wrap">
          <table className="draft-table">
            <thead>
              <tr>
                <th scope="col">Pick</th>
                <th scope="col">Team</th>
                <th scope="col">Conf</th>
                <th scope="col">Chance</th>
              </tr>
            </thead>
            <tbody>
              {draftOrder.map((team, index) => (
                <tr key={team.id}>
                  <td className="pick-cell">{index + 1}</td>
                  <td>
                    <div className="team-cell">
                      <img
                        src={team.logoUrl}
                        alt=""
                        className="team-logo"
                        loading="lazy"
                      />
                      <div>
                        <strong>{team.name}</strong>
                        <span>{team.abbreviation}</span>
                      </div>
                    </div>
                  </td>
                  <td>{team.conference}</td>
                  <td className="chance-cell">{FAIR_CHANCE_LABEL}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <strong>Aucun tirage lancé</strong>
          <p>
            Lance une simulation pour générer les 30 positions, les sauvegarder
            en base et alimenter la page Draft.
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
