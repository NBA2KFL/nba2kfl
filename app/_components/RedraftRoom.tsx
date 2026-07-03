"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { NBA_TEAMS, type Team } from "@/data/teams";
import {
  createSnakeDraftPicks,
  REDRAFT_PICKS_STORAGE_KEY,
  REDRAFT_PLAYER_POOL_STORAGE_KEY,
  type FranchiseSelection,
  type SnakeDraftPick
} from "@/lib/redraft";

const DEFAULT_ROUNDS = 4;
const REDRAFT_ROUNDS_STORAGE_KEY = "nba2kfl:redraft-rounds:v1";
const DEFAULT_PLAYER_POOL = Array.from(
  { length: NBA_TEAMS.length * DEFAULT_ROUNDS },
  (_, index) => `Joueur ${index + 1}`
).join("\n");

type PicksByNumber = Record<string, string>;
type FranchiseSelectionsApiResponse = {
  selections?: FranchiseSelection[];
  error?: string;
};

export function RedraftRoom() {
  const [selections, setSelections] = useState<FranchiseSelection[]>([]);
  const [rounds, setRounds] = useState(DEFAULT_ROUNDS);
  const [playerPoolText, setPlayerPoolText] = useState(DEFAULT_PLAYER_POOL);
  const [picksByNumber, setPicksByNumber] = useState<PicksByNumber>({});
  const [hasLoaded, setHasLoaded] = useState(false);
  const [selectionLoadError, setSelectionLoadError] = useState<string | null>(
    null
  );

  useEffect(() => {
    let isMounted = true;

    async function restoreDraftState() {
      const restoredRounds = Number(
        window.localStorage.getItem(REDRAFT_ROUNDS_STORAGE_KEY)
      );
      const restoredPicks = parseStoredPicks(
        window.localStorage.getItem(REDRAFT_PICKS_STORAGE_KEY)
      );

      try {
        const restoredSelections = await requestFranchiseSelections();

        if (isMounted) {
          setSelections(restoredSelections);
          setSelectionLoadError(null);
        }
      } catch (error) {
        if (isMounted) {
          setSelections([]);
          setSelectionLoadError(toErrorMessage(error));
        }
      }

      if (!isMounted) {
        return;
      }

      setRounds(
        Number.isInteger(restoredRounds) && restoredRounds >= 1
          ? Math.min(restoredRounds, 8)
          : DEFAULT_ROUNDS
      );
      setPlayerPoolText(
        window.localStorage.getItem(REDRAFT_PLAYER_POOL_STORAGE_KEY) ??
          DEFAULT_PLAYER_POOL
      );
      setPicksByNumber(restoredPicks);
      setHasLoaded(true);
    }

    restoreDraftState();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasLoaded) {
      return;
    }

    window.localStorage.setItem(REDRAFT_ROUNDS_STORAGE_KEY, String(rounds));
    window.localStorage.setItem(REDRAFT_PLAYER_POOL_STORAGE_KEY, playerPoolText);
    window.localStorage.setItem(
      REDRAFT_PICKS_STORAGE_KEY,
      JSON.stringify(picksByNumber)
    );
  }, [hasLoaded, picksByNumber, playerPoolText, rounds]);

  const draftPicks = useMemo(
    () => createSnakeDraftPicks(selections, rounds),
    [rounds, selections]
  );
  const playerPool = useMemo(() => parsePlayerPool(playerPoolText), [playerPoolText]);
  const selectedPlayers = useMemo(
    () => new Set(Object.values(picksByNumber).filter(Boolean)),
    [picksByNumber]
  );
  const completedPicks = draftPicks.filter(
    (pick) => picksByNumber[pick.pickNumber]
  ).length;
  const currentPick = draftPicks.find((pick) => !picksByNumber[pick.pickNumber]);

  function updateRounds(value: string) {
    const nextRounds = Number(value);

    if (Number.isInteger(nextRounds)) {
      setRounds(Math.min(Math.max(nextRounds, 1), 8));
    }
  }

  function updatePick(pickNumber: number, playerName: string) {
    setPicksByNumber((currentPicks) => {
      const nextPicks = { ...currentPicks };

      if (playerName) {
        nextPicks[pickNumber] = playerName;
      } else {
        delete nextPicks[pickNumber];
      }

      return nextPicks;
    });
  }

  function clearPicks() {
    setPicksByNumber({});
  }

  return (
    <section className="lottery-panel workflow-panel" aria-labelledby="redraft-title">
      <div className="lottery-header">
        <div>
          <p className="section-label">Redraft joueurs</p>
          <h2 id="redraft-title">Draft snake NBA2KFL</h2>
          <p className="lottery-copy">
            Le tour 1 suit l'ordre des franchises, le tour 2 repart en sens
            inverse, puis l'alternance continue.
          </p>
        </div>

        <div className="lottery-actions" aria-label="Actions redraft">
          <button className="secondary-action" onClick={clearPicks}>
            Vider picks
          </button>
          <Link className="primary-action" href="/draft/franchises">
            Franchises
          </Link>
        </div>
      </div>

      <div className="summary-strip" aria-label="Résumé redraft">
        <div>
          <span>Franchises</span>
          <strong>{selections.filter((selection) => selection.teamId).length}</strong>
        </div>
        <div>
          <span>Tours</span>
          <strong>{rounds}</strong>
        </div>
        <div>
          <span>Picks</span>
          <strong>
            {completedPicks}/{draftPicks.length}
          </strong>
        </div>
        <div>
          <span>Sur le clock</span>
          <strong>{currentPick ? formatSelection(currentPick) : "Terminé"}</strong>
        </div>
      </div>

      {draftPicks.length === 0 ? (
        <div className="empty-state" role={selectionLoadError ? "alert" : undefined}>
          <strong>
            {selectionLoadError
              ? "Franchises indisponibles"
              : "Aucune franchise attribuée"}
          </strong>
          <p>
            {selectionLoadError ??
              "Enregistre au moins une franchise sur la page Franchises pour ouvrir la redraft."}
          </p>
          <Link className="primary-action inline-action" href="/draft/franchises">
            Choisir les franchises
          </Link>
        </div>
      ) : (
        <div className="redraft-workspace">
          <aside className="redraft-controls" aria-label="Configuration redraft">
            <label className="field-stack">
              <span>Tours</span>
              <input
                className="control-input"
                max={8}
                min={1}
                onChange={(event) => updateRounds(event.target.value)}
                type="number"
                value={rounds}
              />
            </label>

            <label className="field-stack">
              <span>Joueurs disponibles</span>
              <textarea
                className="player-pool-input"
                onChange={(event) => setPlayerPoolText(event.target.value)}
                value={playerPoolText}
              />
            </label>
          </aside>

          <ol className="redraft-pick-list">
            {draftPicks.map((pick) => (
              <RedraftPickRow
                currentPickNumber={currentPick?.pickNumber ?? null}
                key={pick.pickNumber}
                onChange={updatePick}
                pick={pick}
                playerPool={playerPool}
                selectedPlayer={picksByNumber[pick.pickNumber] ?? ""}
                selectedPlayers={selectedPlayers}
              />
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function RedraftPickRow({
  currentPickNumber,
  onChange,
  pick,
  playerPool,
  selectedPlayer,
  selectedPlayers
}: {
  currentPickNumber: number | null;
  onChange: (pickNumber: number, playerName: string) => void;
  pick: SnakeDraftPick;
  playerPool: string[];
  selectedPlayer: string;
  selectedPlayers: Set<string>;
}) {
  const team = findTeam(pick.selection.teamId);
  const playerOptions = getPlayerOptions(playerPool, selectedPlayers, selectedPlayer);

  return (
    <li
      className={`redraft-pick-row${
        currentPickNumber === pick.pickNumber ? " is-current" : ""
      }`}
    >
      <div className="redraft-pick-meta">
        <strong>#{pick.pickNumber}</strong>
        <span>
          T{pick.round}.{pick.roundPick}
        </span>
      </div>

      <div className="redraft-team-cell">
        {team ? <TeamLogo team={team} /> : null}
        <div>
          <strong>{pick.selection.gmName}</strong>
          <span>{team ? team.name : "Franchise"}</span>
        </div>
      </div>

      <select
        aria-label={`Joueur du pick ${pick.pickNumber}`}
        className="control-select"
        onChange={(event) => onChange(pick.pickNumber, event.target.value)}
        value={selectedPlayer}
      >
        <option value="">Choisir joueur</option>
        {playerOptions.map((playerName) => (
          <option key={playerName} value={playerName}>
            {playerName}
          </option>
        ))}
      </select>
    </li>
  );
}

function findTeam(teamId: string | null) {
  return NBA_TEAMS.find((team) => team.id === teamId) ?? null;
}

function formatSelection(pick: SnakeDraftPick) {
  const team = findTeam(pick.selection.teamId);

  return team
    ? `#${pick.pickNumber} ${team.abbreviation}`
    : `#${pick.pickNumber}`;
}

function getPlayerOptions(
  playerPool: readonly string[],
  selectedPlayers: ReadonlySet<string>,
  selectedPlayer: string
) {
  const options = playerPool.filter(
    (playerName) => playerName === selectedPlayer || !selectedPlayers.has(playerName)
  );

  if (selectedPlayer && !options.includes(selectedPlayer)) {
    return [selectedPlayer, ...options];
  }

  return options;
}

function parsePlayerPool(value: string) {
  const seenPlayers = new Set<string>();

  return value
    .split(/\r?\n/)
    .map((playerName) => playerName.trim())
    .filter((playerName) => {
      if (!playerName || seenPlayers.has(playerName)) {
        return false;
      }

      seenPlayers.add(playerName);
      return true;
    });
}

function parseStoredPicks(storedValue: string | null): PicksByNumber {
  if (!storedValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(storedValue);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const picks: PicksByNumber = {};

    for (const [pickNumber, playerName] of Object.entries(parsed)) {
      if (Number.isInteger(Number(pickNumber)) && typeof playerName === "string") {
        picks[pickNumber] = playerName;
      }
    }

    return picks;
  } catch {
    return {};
  }
}

function TeamLogo({ team }: { team: Team }) {
  return <img src={team.logoUrl} alt="" className="team-logo" loading="lazy" />;
}

async function requestFranchiseSelections() {
  const response = await fetch("/api/franchise-selections");
  const payload = (await response
    .json()
    .catch(() => ({}))) as FranchiseSelectionsApiResponse;

  if (!response.ok) {
    throw new Error(payload.error ?? "Impossible de charger les franchises.");
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
