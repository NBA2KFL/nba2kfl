"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { NBA_TEAMS, type Team } from "@/data/teams";
import {
  createDraftSlots,
  FRANCHISE_SELECTION_STORAGE_KEY,
  parseFranchiseSelections,
  type FranchiseSelection
} from "@/lib/redraft";

const TEAM_IDS = NBA_TEAMS.map((team) => team.id);

export function FranchiseSelectionBoard() {
  const [selections, setSelections] = useState<FranchiseSelection[]>(
    createDraftSlots(NBA_TEAMS.length)
  );
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const restored = parseFranchiseSelections(
      window.localStorage.getItem(FRANCHISE_SELECTION_STORAGE_KEY),
      NBA_TEAMS.length,
      TEAM_IDS
    );

    setSelections(restored ?? createDraftSlots(NBA_TEAMS.length));
    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (!hasLoaded) {
      return;
    }

    window.localStorage.setItem(
      FRANCHISE_SELECTION_STORAGE_KEY,
      JSON.stringify(selections)
    );
  }, [hasLoaded, selections]);

  const selectedTeamIds = useMemo(
    () =>
      new Set(
        selections
          .map((selection) => selection.teamId)
          .filter((teamId): teamId is string => Boolean(teamId))
      ),
    [selections]
  );
  const assignedCount = selectedTeamIds.size;
  const nextSelection = selections.find((selection) => !selection.teamId);

  function updateSelection(
    slot: number,
    updater: (selection: FranchiseSelection) => FranchiseSelection
  ) {
    setSelections((currentSelections) =>
      currentSelections.map((selection) =>
        selection.slot === slot ? updater(selection) : selection
      )
    );
  }

  function updateTeam(slot: number, teamId: string) {
    updateSelection(slot, (selection) => ({
      ...selection,
      teamId: teamId || null
    }));
  }

  function resetSelections() {
    setSelections(createDraftSlots(NBA_TEAMS.length));
  }

  return (
    <section className="lottery-panel workflow-panel" aria-labelledby="franchise-title">
      <div className="lottery-header">
        <div>
          <p className="section-label">Sélection franchises</p>
          <h2 id="franchise-title">Choix NBA par rang de GM</h2>
          <p className="lottery-copy">
            L'ordre vient du tirage externe. Les franchises sélectionnées sont
            sauvegardées pour alimenter la redraft.
          </p>
        </div>

        <div className="lottery-actions" aria-label="Actions franchises">
          <button className="secondary-action" onClick={resetSelections}>
            Réinitialiser
          </button>
          <Link className="primary-action" href="/draft/redraft">
            Ouvrir redraft
          </Link>
          <Link className="tertiary-action" href="/draft">
            Board draft
          </Link>
        </div>
      </div>

      <div className="summary-strip" aria-label="Résumé franchises">
        <div>
          <span>Places</span>
          <strong>{selections.length}</strong>
        </div>
        <div>
          <span>Attribuées</span>
          <strong>
            {assignedCount}/{NBA_TEAMS.length}
          </strong>
        </div>
        <div>
          <span>Prochain choix</span>
          <strong>{nextSelection ? `#${nextSelection.slot}` : "Terminé"}</strong>
        </div>
        <div>
          <span>Source</span>
          <strong>Tirage externe</strong>
        </div>
      </div>

      <div className="selection-table-wrap">
        <table className="selection-table">
          <thead>
            <tr>
              <th scope="col">Rang</th>
              <th scope="col">GM</th>
              <th scope="col">Franchise NBA</th>
              <th scope="col">Statut</th>
            </tr>
          </thead>
          <tbody>
            {selections.map((selection) => {
              const selectedTeam = findTeam(selection.teamId);
              const isNext = nextSelection?.slot === selection.slot;

              return (
                <tr className={isNext ? "is-current" : undefined} key={selection.slot}>
                  <td className="pick-cell">{selection.slot}</td>
                  <td>
                    <span className="locked-gm-name">{selection.gmName}</span>
                  </td>
                  <td>
                    <div className="selection-team-control">
                      {selectedTeam ? <TeamLogo team={selectedTeam} /> : null}
                      <select
                        aria-label={`Franchise du rang ${selection.slot}`}
                        className="control-select"
                        onChange={(event) =>
                          updateTeam(selection.slot, event.target.value)
                        }
                        value={selection.teamId ?? ""}
                      >
                        <option value="">Franchise à choisir</option>
                        {NBA_TEAMS.map((team) => (
                          <option
                            disabled={
                              selectedTeamIds.has(team.id) &&
                              team.id !== selection.teamId
                            }
                            key={team.id}
                            value={team.id}
                          >
                            {team.abbreviation} - {team.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="status-cell">
                    {selectedTeam ? selectedTeam.abbreviation : "Libre"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function findTeam(teamId: string | null) {
  return NBA_TEAMS.find((team) => team.id === teamId) ?? null;
}

function TeamLogo({ team }: { team: Team }) {
  return <img src={team.logoUrl} alt="" className="team-logo" loading="lazy" />;
}
