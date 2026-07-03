"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { NBA_TEAMS, type Team } from "@/data/teams";
import {
  createDraftSlots,
  type FranchiseSelection
} from "@/lib/redraft";

type FranchiseSelectionsApiResponse = {
  selections?: FranchiseSelection[];
  error?: string;
};

export function FranchiseSelectionBoard() {
  const [selections, setSelections] = useState<FranchiseSelection[]>(
    createDraftSlots(NBA_TEAMS.length)
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savingSlot, setSavingSlot] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSelections() {
      try {
        const nextSelections = await requestFranchiseSelections();

        if (isMounted) {
          setSelections(nextSelections);
          setErrorMessage(null);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(toErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSelections();

    return () => {
      isMounted = false;
    };
  }, []);

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

  async function updateTeam(slot: number, teamId: string) {
    setSavingSlot(slot);
    setErrorMessage(null);

    try {
      setSelections(
        await requestFranchiseSelections({
          body: JSON.stringify({ slot, teamId: teamId || null }),
          headers: { "Content-Type": "application/json" },
          method: "PATCH"
        })
      );
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setSavingSlot(null);
    }
  }

  async function resetSelections() {
    setSavingSlot(0);
    setErrorMessage(null);

    try {
      setSelections(await requestFranchiseSelections({ method: "DELETE" }));
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setSavingSlot(null);
    }
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
          <button
            className="secondary-action"
            disabled={isLoading || savingSlot !== null}
            onClick={resetSelections}
          >
            Réinitialiser
          </button>
          <Link className="primary-action" href="/draft/redraft">
            Ouvrir redraft
          </Link>
        </div>
      </div>

      {errorMessage ? (
        <div className="empty-state" role="alert">
          <strong>Franchises indisponibles</strong>
          <p>{errorMessage}</p>
        </div>
      ) : null}

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
          <strong>{isLoading ? "Chargement" : "Base DB"}</strong>
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
                        disabled={isLoading || savingSlot !== null}
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
                    {savingSlot === selection.slot
                      ? "Sauvegarde"
                      : selectedTeam
                        ? selectedTeam.abbreviation
                        : "Libre"}
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

async function requestFranchiseSelections(init?: RequestInit) {
  const response = await fetch("/api/franchise-selections", init);
  const payload = (await response
    .json()
    .catch(() => ({}))) as FranchiseSelectionsApiResponse;

  if (!response.ok) {
    throw new Error(payload.error ?? "Impossible de sauvegarder les franchises.");
  }

  if (!Array.isArray(payload.selections)) {
    throw new Error("Reponse franchises invalide.");
  }

  return payload.selections;
}

function toErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Impossible de charger les franchises.";
}
