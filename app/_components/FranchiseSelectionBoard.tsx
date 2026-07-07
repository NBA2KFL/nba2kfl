"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { NBA_TEAMS, type Team } from "@/data/teams";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  createDraftSlots,
  type FranchiseSelection
} from "@/lib/redraft";

const NO_TEAM_SELECTED = "__none__";

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

  return (
    <section
      aria-labelledby="franchise-title"
      className="min-w-0 overflow-hidden rounded-[18px] border border-command-border bg-command-surface shadow-[0_18px_48px_rgba(16,24,40,0.08)]"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_232px] items-start gap-6 border-b border-command-border bg-command-surface p-5 max-[1040px]:grid-cols-1 max-[620px]:p-4">
        <div>
          <p className="mb-1 text-[0.64rem] font-[760] leading-none uppercase tracking-[0.14em] text-command-muted">
            Sélection franchises
          </p>
          <h2
            className="mb-2 text-[1.33rem] font-[730] leading-[1.08] tracking-[-0.045em] text-command-ink max-[620px]:text-[1.18rem]"
            id="franchise-title"
          >
            Choix NBA par rang de GM
          </h2>
          <p className="mb-0 max-w-[720px] text-[0.9rem] leading-[1.56] text-command-muted-strong max-[620px]:text-[0.88rem]">
            L'ordre vient du tirage externe. Les franchises sélectionnées sont
            sauvegardées pour alimenter la redraft.
          </p>
        </div>

<<<<<<< HEAD
        <div className="lottery-actions" aria-label="Actions franchises">
          <Link className="primary-action" href="/draft/redraft">
            Ouvrir redraft
          </Link>
=======
        <div
          aria-label="Actions franchises"
          className="grid w-full gap-2 max-[1040px]:grid-cols-3 max-[620px]:grid-cols-1"
        >
          <Button
            disabled={isLoading || savingSlot !== null}
            onClick={resetSelections}
            variant="secondary"
          >
            Réinitialiser
          </Button>
          <Button asChild>
            <Link href="/draft/redraft">Ouvrir redraft</Link>
          </Button>
>>>>>>> 58c7379170c8db82032247a2ea1d7b11974e7fa2
        </div>
      </div>

      {errorMessage ? (
        <div
          className="grid min-h-[300px] content-center justify-items-center gap-2.5 p-8 text-center"
          role="alert"
        >
          <strong className="text-[1.04rem] font-[740] tracking-[-0.025em] text-command-ink">
            Franchises indisponibles
          </strong>
          <p className="m-0 max-w-[470px] leading-[1.56] text-command-muted-strong">
            {errorMessage}
          </p>
        </div>
      ) : null}

      <div
        aria-label="Résumé franchises"
        className="grid grid-cols-4 border-b border-command-border bg-command-surface-muted/55 max-[1040px]:grid-cols-2 max-[620px]:grid-cols-1"
      >
        <div className="min-h-[64px] border-r border-command-border px-4 py-3 max-[1040px]:border-b max-[1040px]:border-command-border max-[620px]:border-r-0">
          <span className="mb-1.5 block text-[0.64rem] font-[760] leading-none uppercase tracking-[0.13em] text-command-muted">
            Places
          </span>
          <strong className="text-[0.94rem] font-[720] leading-tight tracking-[-0.02em] text-command-ink">
            {selections.length}
          </strong>
        </div>
        <div className="min-h-[64px] border-r border-command-border px-4 py-3 max-[1040px]:border-r-0 max-[1040px]:border-b max-[1040px]:border-command-border">
          <span className="mb-1.5 block text-[0.64rem] font-[760] leading-none uppercase tracking-[0.13em] text-command-muted">
            Attribuées
          </span>
          <strong className="text-[0.94rem] font-[720] leading-tight tracking-[-0.02em] text-command-ink">
            {assignedCount}/{NBA_TEAMS.length}
          </strong>
        </div>
<<<<<<< HEAD
        <div>
          <span>Prochain choix</span>
          <strong>{nextSelection ? `#${nextSelection.slot}` : "Verrouillé"}</strong>
        </div>
        <div>
          <span>Source</span>
          <strong>{isLoading ? "Chargement" : "Sélection finale"}</strong>
=======
        <div className="min-h-[64px] border-r border-command-border px-4 py-3 max-[620px]:border-r-0 max-[620px]:border-b max-[620px]:border-command-border">
          <span className="mb-1.5 block text-[0.64rem] font-[760] leading-none uppercase tracking-[0.13em] text-command-muted">
            Prochain choix
          </span>
          <strong className="text-[0.94rem] font-[720] leading-tight tracking-[-0.02em] text-command-ink">
            {nextSelection ? `#${nextSelection.slot}` : "Terminé"}
          </strong>
        </div>
        <div className="min-h-[64px] px-4 py-3">
          <span className="mb-1.5 block text-[0.64rem] font-[760] leading-none uppercase tracking-[0.13em] text-command-muted">
            Source
          </span>
          <strong className="text-[0.94rem] font-[720] leading-tight tracking-[-0.02em] text-command-ink">
            {isLoading ? "Chargement" : "Base DB"}
          </strong>
>>>>>>> 58c7379170c8db82032247a2ea1d7b11974e7fa2
        </div>
      </div>

      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse bg-command-surface">
          <thead>
            <tr>
              <th
                className="h-9 border-b border-command-border bg-command-surface-muted px-3.5 py-2.5 text-left text-[0.63rem] font-[760] tracking-[0.13em] text-command-muted uppercase"
                scope="col"
              >
                Rang
              </th>
              <th
                className="h-9 border-b border-command-border bg-command-surface-muted px-3.5 py-2.5 text-left text-[0.63rem] font-[760] tracking-[0.13em] text-command-muted uppercase"
                scope="col"
              >
                GM
              </th>
              <th
                className="h-9 border-b border-command-border bg-command-surface-muted px-3.5 py-2.5 text-left text-[0.63rem] font-[760] tracking-[0.13em] text-command-muted uppercase"
                scope="col"
              >
                Franchise NBA
              </th>
              <th
                className="h-9 border-b border-command-border bg-command-surface-muted px-3.5 py-2.5 text-left text-[0.63rem] font-[760] tracking-[0.13em] text-command-muted uppercase"
                scope="col"
              >
                Statut
              </th>
            </tr>
          </thead>
          <tbody>
            {selections.map((selection) => {
              const selectedTeam = findTeam(selection.teamId);
              const isNext = nextSelection?.slot === selection.slot;

              return (
                <tr
                  className={cn(
                    "border-b border-command-border",
                    isNext
                      ? "bg-command-accent-soft shadow-[inset_3px_0_0_var(--color-command-accent)]"
                      : "odd:bg-command-surface-muted/45 hover:bg-command-accent-soft/65"
                  )}
                  key={selection.slot}
                >
                  <td className="w-16 px-3.5 py-2.5 text-[0.98rem] font-[760] text-command-accent-dark">
                    {selection.slot}
                  </td>
                  <td className="px-3.5 py-2.5">
                    <span className="block min-h-[38px] rounded-[10px] border border-command-border bg-command-surface-muted px-3 py-2 text-[0.86rem] font-[670] leading-tight text-command-ink">
                      {selection.gmName}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <div className="grid grid-cols-[30px_minmax(0,1fr)] items-center gap-2.5">
                      {selectedTeam ? <TeamLogo team={selectedTeam} /> : null}
<<<<<<< HEAD
                      <span className="locked-franchise-name">
                        {selectedTeam
                          ? `${selectedTeam.abbreviation} - ${selectedTeam.name}`
                          : "Franchise verrouillée"}
                      </span>
                    </div>
                  </td>
                  <td className="status-cell">
                    {selectedTeam ? "Verrouillé" : "Libre"}
=======
                      <Select
                        disabled={isLoading || savingSlot !== null}
                        onValueChange={(value) =>
                          updateTeam(
                            selection.slot,
                            value === NO_TEAM_SELECTED ? "" : value
                          )
                        }
                        value={selection.teamId ?? NO_TEAM_SELECTED}
                      >
                        <SelectTrigger
                          aria-label={`Franchise du rang ${selection.slot}`}
                          className={cn(!selectedTeam && "col-span-full")}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_TEAM_SELECTED}>
                            Franchise à choisir
                          </SelectItem>
                          {NBA_TEAMS.map((team) => (
                            <SelectItem
                              disabled={
                                selectedTeamIds.has(team.id) &&
                                team.id !== selection.teamId
                              }
                              key={team.id}
                              value={team.id}
                            >
                              {team.abbreviation} - {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5 text-[0.74rem] font-[720] text-command-muted">
                    {savingSlot === selection.slot
                      ? "Sauvegarde"
                      : selectedTeam
                        ? selectedTeam.abbreviation
                        : "Libre"}
>>>>>>> 58c7379170c8db82032247a2ea1d7b11974e7fa2
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
  return (
    <img
      alt=""
      className="h-[28px] w-[28px] shrink-0 object-contain"
      loading="lazy"
      src={team.logoUrl}
    />
  );
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
