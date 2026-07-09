"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { NBA_TEAMS, type Team } from "@/data/teams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Nba2kRosterPlayerSummary } from "@/lib/nba2k-roster-db";
import {
  createSnakeDraftPicks,
  REDRAFT_PICKS_STORAGE_KEY,
  type FranchiseSelection,
  type SnakeDraftPick
} from "@/lib/redraft";

const NO_PLAYER_SELECTED = "__none__";
const MIN_REDRAFT_ROUNDS = 1;
export const MAX_REDRAFT_ROUNDS = 14;
const DEFAULT_ROUNDS = MAX_REDRAFT_ROUNDS;
const REDRAFT_ROUNDS_STORAGE_KEY = "nba2kfl:redraft-rounds:v1";

type PicksByNumber = Record<string, string>;
type FranchiseSelectionsApiResponse = {
  selections?: FranchiseSelection[];
  error?: string;
};
type PlayersApiResponse = {
  players?: Nba2kRosterPlayerSummary[];
  error?: string;
};
type RedraftPlayerOption = {
  label: string;
  value: string;
};

export function RedraftRoom() {
  const [selections, setSelections] = useState<FranchiseSelection[]>([]);
  const [rounds, setRounds] = useState(DEFAULT_ROUNDS);
  const [rosterPlayers, setRosterPlayers] = useState<Nba2kRosterPlayerSummary[]>(
    []
  );
  const [picksByNumber, setPicksByNumber] = useState<PicksByNumber>({});
  const [openPickNumber, setOpenPickNumber] = useState<number | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [selectionLoadError, setSelectionLoadError] = useState<string | null>(
    null
  );
  const [playerLoadError, setPlayerLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function restoreDraftState() {
      const restoredRounds = Number(
        window.localStorage.getItem(REDRAFT_ROUNDS_STORAGE_KEY)
      );
      const restoredPicks = parseStoredPicks(
        window.localStorage.getItem(REDRAFT_PICKS_STORAGE_KEY)
      );

      const [selectionResult, playerResult] = await Promise.allSettled([
        requestFranchiseSelections(),
        requestRosterPlayers()
      ]);

      if (!isMounted) {
        return;
      }

      if (selectionResult.status === "fulfilled") {
        setSelections(selectionResult.value);
        setSelectionLoadError(null);
      } else {
        setSelections([]);
        setSelectionLoadError(toErrorMessage(selectionResult.reason));
      }

      if (playerResult.status === "fulfilled") {
        setRosterPlayers(playerResult.value);
        setPlayerLoadError(null);
      } else {
        setRosterPlayers([]);
        setPlayerLoadError(toErrorMessage(playerResult.reason));
      }

      setRounds(
        normalizeRedraftRounds(restoredRounds)
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
    window.localStorage.setItem(
      REDRAFT_PICKS_STORAGE_KEY,
      JSON.stringify(picksByNumber)
    );
  }, [hasLoaded, picksByNumber, rounds]);

  const draftPicks = useMemo(
    () => createSnakeDraftPicks(selections, rounds),
    [rounds, selections]
  );
  const selectedPlayers = useMemo(
    () => new Set(Object.values(picksByNumber).filter(Boolean)),
    [picksByNumber]
  );
  const completedPicks = draftPicks.filter(
    (pick) => picksByNumber[pick.pickNumber]
  ).length;
  const currentPick = draftPicks.find((pick) => !picksByNumber[pick.pickNumber]);
  const playerStatusText = getPlayerStatusText({
    hasLoaded,
    playerCount: rosterPlayers.length,
    playerLoadError
  });

  function updateRounds(value: string) {
    const nextRounds = Number(value);

    if (Number.isInteger(nextRounds)) {
      setRounds(normalizeRedraftRounds(nextRounds));
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
    <section
      aria-labelledby="redraft-title"
      className="min-w-0 overflow-hidden rounded-[18px] border border-command-border bg-command-surface shadow-[0_18px_48px_rgba(16,24,40,0.08)]"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_232px] items-start gap-6 border-b border-command-border bg-command-surface p-5 max-[1040px]:grid-cols-1 max-[620px]:p-4">
        <div>
          <p className="mb-1 text-[0.64rem] font-[760] leading-none uppercase tracking-[0.14em] text-command-muted">
            Redraft joueurs
          </p>
          <h2
            className="mb-2 text-[1.33rem] font-[730] leading-[1.08] tracking-[-0.045em] text-command-ink max-[620px]:text-[1.18rem]"
            id="redraft-title"
          >
            Draft snake NBA2KFL
          </h2>
          <p className="mb-0 max-w-[720px] text-[0.9rem] leading-[1.56] text-command-muted-strong max-[620px]:text-[0.88rem]">
            Le tour 1 suit l'ordre des franchises, le tour 2 repart en sens
            inverse, puis l'alternance continue.
          </p>
        </div>

        <div
          aria-label="Actions redraft"
          className="grid w-full gap-2 max-[1040px]:grid-cols-3 max-[620px]:grid-cols-1"
        >
          <Button onClick={clearPicks} variant="secondary">
            Vider picks
          </Button>
          <Button asChild>
            <Link href="/draft/franchises">Franchises</Link>
          </Button>
        </div>
      </div>

      <div
        aria-label="Résumé redraft"
        className="grid grid-cols-4 border-b border-command-border bg-command-surface-muted/55 max-[1040px]:grid-cols-2 max-[620px]:grid-cols-1"
      >
        <div className="min-h-[64px] border-r border-command-border px-4 py-3 max-[1040px]:border-b max-[1040px]:border-command-border max-[620px]:border-r-0">
          <span className="mb-1.5 block text-[0.64rem] font-[760] leading-none uppercase tracking-[0.13em] text-command-muted">
            Franchises
          </span>
          <strong className="text-[0.94rem] font-[720] leading-tight tracking-[-0.02em] text-command-ink">
            {selections.filter((selection) => selection.teamId).length}
          </strong>
        </div>
        <div className="min-h-[64px] border-r border-command-border px-4 py-3 max-[1040px]:border-r-0 max-[1040px]:border-b max-[1040px]:border-command-border">
          <span className="mb-1.5 block text-[0.64rem] font-[760] leading-none uppercase tracking-[0.13em] text-command-muted">
            Tours
          </span>
          <strong className="text-[0.94rem] font-[720] leading-tight tracking-[-0.02em] text-command-ink">
            {rounds}
          </strong>
        </div>
        <div className="min-h-[64px] border-r border-command-border px-4 py-3 max-[620px]:border-r-0 max-[620px]:border-b max-[620px]:border-command-border">
          <span className="mb-1.5 block text-[0.64rem] font-[760] leading-none uppercase tracking-[0.13em] text-command-muted">
            Picks
          </span>
          <strong className="text-[0.94rem] font-[720] leading-tight tracking-[-0.02em] text-command-ink">
            {completedPicks}/{draftPicks.length}
          </strong>
        </div>
        <div className="min-h-[64px] px-4 py-3">
          <span className="mb-1.5 block text-[0.64rem] font-[760] leading-none uppercase tracking-[0.13em] text-command-muted">
            Sur le clock
          </span>
          <strong className="text-[0.94rem] font-[720] leading-tight tracking-[-0.02em] text-command-ink">
            {currentPick ? formatSelection(currentPick) : "Terminé"}
          </strong>
        </div>
      </div>

      {draftPicks.length === 0 ? (
        <div
          className="grid min-h-[300px] content-center justify-items-center gap-2.5 p-8 text-center"
          role={selectionLoadError ? "alert" : undefined}
        >
          <strong className="text-[1.04rem] font-[740] tracking-[-0.025em] text-command-ink">
            {selectionLoadError
              ? "Franchises indisponibles"
              : "Aucune franchise attribuée"}
          </strong>
          <p className="m-0 max-w-[470px] leading-[1.56] text-command-muted-strong">
            {selectionLoadError ??
              "Enregistre au moins une franchise sur la page Franchises pour ouvrir la redraft."}
          </p>
          <Button asChild className="min-w-[220px] px-4">
            <Link href="/draft/franchises">Choisir les franchises</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-[300px_minmax(0,1fr)] gap-0 max-[1040px]:grid-cols-1">
          <aside
            aria-label="Configuration redraft"
            className="grid content-start gap-3.5 border-r border-command-border bg-command-surface-muted/45 p-4 max-[1040px]:border-r-0 max-[1040px]:border-b max-[1040px]:border-command-border"
          >
            <label className="grid gap-2">
              <span className="text-[0.64rem] font-[760] leading-none uppercase tracking-[0.13em] text-command-muted">
                Tours
              </span>
              <Input
                max={MAX_REDRAFT_ROUNDS}
                min={MIN_REDRAFT_ROUNDS}
                onChange={(event) => updateRounds(event.target.value)}
                type="number"
                value={rounds}
              />
            </label>

            <div
              className="grid gap-1.5 rounded-[10px] border border-command-border bg-command-surface p-3"
              role={
                playerStatusText.isAlert ? "alert" : undefined
              }
            >
              <span className="text-[0.64rem] font-[760] leading-none uppercase tracking-[0.13em] text-command-muted">
                Joueurs DB
              </span>
              <strong className="text-[0.92rem] font-[720] tracking-[-0.02em] text-command-ink">
                {playerStatusText.title}
              </strong>
              <p className="m-0 text-[0.8rem] leading-[1.45] text-command-muted-strong">
                {playerStatusText.description}
              </p>
            </div>
          </aside>

          <ol className="m-0 grid list-none p-0">
            {draftPicks.map((pick) => (
              <RedraftPickRow
                currentPickNumber={currentPick?.pickNumber ?? null}
                key={pick.pickNumber}
                isPlayerPickerOpen={openPickNumber === pick.pickNumber}
                onChange={updatePick}
                onOpenChange={(isOpen) =>
                  setOpenPickNumber((currentPickNumber) =>
                    isOpen
                      ? pick.pickNumber
                      : currentPickNumber === pick.pickNumber
                        ? null
                        : currentPickNumber
                  )
                }
                pick={pick}
                players={rosterPlayers}
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
  isPlayerPickerOpen,
  onChange,
  onOpenChange,
  pick,
  players,
  selectedPlayer,
  selectedPlayers
}: {
  currentPickNumber: number | null;
  isPlayerPickerOpen: boolean;
  onChange: (pickNumber: number, playerName: string) => void;
  onOpenChange: (isOpen: boolean) => void;
  pick: SnakeDraftPick;
  players: Nba2kRosterPlayerSummary[];
  selectedPlayer: string;
  selectedPlayers: Set<string>;
}) {
  const team = findTeam(pick.selection.teamId);
  const playerOptions = getVisiblePlayerOptions({
    isOpen: isPlayerPickerOpen,
    players,
    selectedPlayer,
    selectedPlayers
  });
  const isCurrent = currentPickNumber === pick.pickNumber;

  return (
    <li
      className={cn(
        "grid min-h-[60px] grid-cols-[78px_minmax(220px,1fr)_minmax(220px,320px)] items-center gap-3 border-b border-command-border px-3.5 py-2.5 first:border-t-0 max-[620px]:grid-cols-[60px_minmax(0,1fr)]",
        isCurrent
          ? "bg-command-accent-soft shadow-[inset_3px_0_0_var(--color-command-accent)]"
          : "odd:bg-command-surface-muted/45 hover:bg-command-accent-soft/65"
      )}
    >
      <div className="grid gap-0.5">
        <strong className="text-[0.98rem] font-[760] text-command-accent-dark">
          #{pick.pickNumber}
        </strong>
        <span className="text-[0.72rem] font-[650] text-command-muted">
          T{pick.round}.{pick.roundPick}
        </span>
      </div>

      <div className="flex min-w-0 items-center gap-2.5">
        {team ? <TeamLogo team={team} /> : null}
        <div className="min-w-0">
          <strong className="block overflow-hidden text-ellipsis whitespace-nowrap text-[0.89rem] font-[700] text-command-ink">
            {pick.selection.gmName}
          </strong>
          <span className="mt-0.5 block overflow-hidden text-ellipsis whitespace-nowrap text-[0.76rem] font-[650] text-command-muted">
            {team ? team.name : "Franchise"}
          </span>
        </div>
      </div>

      <Select
        disabled={players.length === 0 && !selectedPlayer}
        onOpenChange={onOpenChange}
        onValueChange={(value) =>
          onChange(pick.pickNumber, value === NO_PLAYER_SELECTED ? "" : value)
        }
        value={selectedPlayer || NO_PLAYER_SELECTED}
      >
        <SelectTrigger
          aria-label={`Joueur du pick ${pick.pickNumber}`}
          className="max-[620px]:col-span-full"
        >
          <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-left">
            {selectedPlayer
              ? getSelectedPlayerLabel(players, selectedPlayer)
              : "Choisir joueur"}
          </span>
        </SelectTrigger>
        {isPlayerPickerOpen ? (
          <SelectContent>
            <SelectItem value={NO_PLAYER_SELECTED}>Choisir joueur</SelectItem>
            {playerOptions.map((player) => (
              <SelectItem key={player.value} value={player.value}>
                {player.label}
              </SelectItem>
            ))}
          </SelectContent>
        ) : null}
      </Select>
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

function getPlayerStatusText({
  hasLoaded,
  playerCount,
  playerLoadError
}: {
  hasLoaded: boolean;
  playerCount: number;
  playerLoadError: string | null;
}) {
  if (!hasLoaded) {
    return {
      description: "Chargement depuis la table NBA 2K.",
      isAlert: false,
      title: "Chargement"
    };
  }

  if (playerLoadError) {
    return {
      description: playerLoadError,
      isAlert: true,
      title: "Indisponibles"
    };
  }

  if (playerCount === 0) {
    return {
      description: "Aucun joueur importé dans la table NBA 2K.",
      isAlert: true,
      title: "0 joueurs"
    };
  }

  return {
    description: "Options chargées depuis la table NBA 2K.",
    isAlert: false,
    title: `${playerCount} joueurs`
  };
}

export function getVisiblePlayerOptions({
  isOpen,
  players,
  selectedPlayer,
  selectedPlayers
}: {
  isOpen: boolean;
  players: readonly Nba2kRosterPlayerSummary[];
  selectedPlayer: string;
  selectedPlayers: ReadonlySet<string>;
}): RedraftPlayerOption[] {
  if (!isOpen) {
    return [];
  }

  const options = players
    .filter(
      (player) =>
        player.fullName === selectedPlayer || !selectedPlayers.has(player.fullName)
    )
    .map((player) => ({
      label: formatPlayerOption(player),
      value: player.fullName
    }));

  if (selectedPlayer && !options.some((option) => option.value === selectedPlayer)) {
    return [{ label: selectedPlayer, value: selectedPlayer }, ...options];
  }

  return options;
}

export function normalizeRedraftRounds(rounds: number) {
  if (!Number.isInteger(rounds)) {
    return DEFAULT_ROUNDS;
  }

  return Math.min(Math.max(rounds, MIN_REDRAFT_ROUNDS), MAX_REDRAFT_ROUNDS);
}

function formatPlayerOption(player: Nba2kRosterPlayerSummary) {
  return [
    player.fullName,
    player.position,
    `OVR ${player.rating}`,
    player.teamName
  ]
    .filter(Boolean)
    .join(" · ");
}

function getSelectedPlayerLabel(
  players: readonly Nba2kRosterPlayerSummary[],
  selectedPlayer: string
) {
  const player = players.find((candidate) => candidate.fullName === selectedPlayer);

  return player ? formatPlayerOption(player) : selectedPlayer;
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
  return (
    <img
      alt=""
      className="h-[28px] w-[28px] shrink-0 object-contain"
      loading="lazy"
      src={team.logoUrl}
    />
  );
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

async function requestRosterPlayers() {
  const response = await fetch("/api/players");
  const payload = (await response.json().catch(() => ({}))) as PlayersApiResponse;

  if (!response.ok) {
    throw new Error(payload.error ?? "Impossible de charger les joueurs.");
  }

  if (!Array.isArray(payload.players)) {
    throw new Error("Reponse joueurs invalide.");
  }

  return payload.players;
}

function toErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Impossible de charger les franchises.";
}
