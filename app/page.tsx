"use client";

import { useMemo, useState } from "react";
import { NBA_TEAMS, type Team } from "@/data/teams";
import { shuffleTeams } from "@/lib/draft";

const FAIR_CHANCE_LABEL = "3.33%";

function formatRunDate(date: Date | null) {
  if (!date) {
    return "Aucune simulation";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export default function Home() {
  const [draftOrder, setDraftOrder] = useState<Team[]>([]);
  const [lastRunAt, setLastRunAt] = useState<Date | null>(null);

  const teamsByConference = useMemo(
    () => ({
      East: NBA_TEAMS.filter((team) => team.conference === "East"),
      West: NBA_TEAMS.filter((team) => team.conference === "West")
    }),
    []
  );

  const hasResult = draftOrder.length > 0;
  const displayedOrder = hasResult ? draftOrder : NBA_TEAMS;

  function runSimulation() {
    setDraftOrder(shuffleTeams(NBA_TEAMS));
    setLastRunAt(new Date());
  }

  function resetSimulation() {
    setDraftOrder([]);
    setLastRunAt(null);
  }

  return (
    <main className="app-shell">
      <header className="site-header" aria-labelledby="page-title">
        <div className="brand-lockup">
          <span className="brand-mark">N2K</span>
          <div>
            <p className="section-label">NBA2KFL Draft Room</p>
            <h1 id="page-title">Simulateur de Draft NBA</h1>
          </div>
        </div>

        <nav className="top-tabs" aria-label="Navigation du simulateur">
          <span className="top-tab is-active">Lottery</span>
          <span className="top-tab">Draft Order</span>
          <span className="top-tab">Teams</span>
        </nav>
      </header>

      <section className="workspace" aria-label="Simulation de draft">
        <section className="lottery-panel" aria-labelledby="lottery-title">
          <div className="lottery-header">
            <div>
              <p className="section-label">Lottery simplifiée</p>
              <h2 id="lottery-title">2026 NBA Draft Lottery Simulator</h2>
              <p className="lottery-copy">
                Tirage équitable : chaque franchise a la même chance d'obtenir
                n'importe quel rang.
              </p>
            </div>

            <div className="lottery-actions" aria-label="Actions de tirage">
              <button className="primary-action" onClick={runSimulation}>
                Sim Lottery
              </button>
              <button
                className="secondary-action"
                disabled={!hasResult}
                onClick={resetSimulation}
              >
                Reset
              </button>
            </div>
          </div>

          <div className="summary-strip" aria-label="Résumé de la simulation">
            <div>
              <span>Teams</span>
              <strong>{NBA_TEAMS.length}</strong>
            </div>
            <div>
              <span>Odds</span>
              <strong>{FAIR_CHANCE_LABEL} each</strong>
            </div>
            <div>
              <span>Last sim</span>
              <strong>{formatRunDate(lastRunAt)}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{hasResult ? "Lottery simulated" : "Ready"}</strong>
            </div>
          </div>

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
                {displayedOrder.map((team, index) => (
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
        </section>

        <aside className="team-pool" aria-labelledby="team-pool-title">
          <div className="side-panel-heading">
            <p className="section-label">Teams</p>
            <h2 id="team-pool-title">Équipes disponibles</h2>
          </div>

          <div className="conference-group">
            <h3>Conférence Est</h3>
            <ul>
              {teamsByConference.East.map((team) => (
                <li key={team.id}>
                  <img src={team.logoUrl} alt="" loading="lazy" />
                  <span>{team.name}</span>
                  <strong>{team.abbreviation}</strong>
                </li>
              ))}
            </ul>
          </div>

          <div className="conference-group">
            <h3>Conférence Ouest</h3>
            <ul>
              {teamsByConference.West.map((team) => (
                <li key={team.id}>
                  <img src={team.logoUrl} alt="" loading="lazy" />
                  <span>{team.name}</span>
                  <strong>{team.abbreviation}</strong>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>
    </main>
  );
}
