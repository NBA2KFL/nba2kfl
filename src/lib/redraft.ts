export type FranchiseSelection = {
  slot: number;
  gmName: string;
  teamId: string | null;
};

export type AssignedFranchiseSelection = FranchiseSelection & {
  teamId: string;
};

export type SnakeDraftPick = {
  pickNumber: number;
  round: number;
  roundPick: number;
  selection: AssignedFranchiseSelection;
};

export const FRANCHISE_SELECTION_STORAGE_KEY =
  "nba2kfl:franchise-selections:v1";
export const REDRAFT_PLAYER_POOL_STORAGE_KEY = "nba2kfl:redraft-player-pool:v1";
export const REDRAFT_PICKS_STORAGE_KEY = "nba2kfl:redraft-picks:v1";

export const DEFAULT_GM_DRAFT_ORDER = [
  "Anna",
  "Ellias",
  "Nico 2e équipe",
  "Clem 2e équipe",
  "Chris",
  "Math",
  "Teepi",
  "Akuma",
  "Tony",
  "Adito",
  "Tamarlin",
  "Tamarlin 2e équipe",
  "Tony 2e équipe",
  "Paul",
  "Tomasninho",
  "Nico",
  "Enzo",
  "Sam",
  "ASL",
  "Khaladan",
  "Masai",
  "Diane",
  "Tidwa",
  "Laiku",
  "Nortalis",
  "Romback",
  "Sparky",
  "Clem",
  "Mat 2e équipe",
  "Naoufel"
] as const;

export function createDraftSlots(
  count: number = DEFAULT_GM_DRAFT_ORDER.length
): FranchiseSelection[] {
  return Array.from({ length: count }, (_, index) => ({
    slot: index + 1,
    gmName: DEFAULT_GM_DRAFT_ORDER[index] ?? `GM ${index + 1}`,
    teamId: null
  }));
}

export function createSnakeDraftPicks(
  selections: readonly FranchiseSelection[],
  rounds: number
): SnakeDraftPick[] {
  if (!Number.isInteger(rounds) || rounds < 1) {
    return [];
  }

  const assignedSelections = selections
    .filter(isAssignedSelection)
    .toSorted((first, second) => first.slot - second.slot);

  return Array.from({ length: rounds }).flatMap((_, roundIndex) => {
    const round = roundIndex + 1;
    const roundSelections =
      round % 2 === 0 ? [...assignedSelections].reverse() : assignedSelections;

    return roundSelections.map((selection, index) => ({
      pickNumber: roundIndex * assignedSelections.length + index + 1,
      round,
      roundPick: index + 1,
      selection
    }));
  });
}

export function parseFranchiseSelections(
  storedValue: string | null,
  slotCount: number,
  validTeamIds: readonly string[]
): FranchiseSelection[] | null {
  if (!storedValue) {
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(storedValue);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed) || parsed.length !== slotCount) {
    return null;
  }

  const validTeamIdSet = new Set(validTeamIds);
  const selectedTeamIds = new Set<string>();
  const slots = new Set<number>();
  const selections: FranchiseSelection[] = [];

  for (const value of parsed) {
    if (!isSelectionShape(value)) {
      return null;
    }

    if (value.slot < 1 || value.slot > slotCount || slots.has(value.slot)) {
      return null;
    }

    if (value.teamId) {
      if (!validTeamIdSet.has(value.teamId) || selectedTeamIds.has(value.teamId)) {
        return null;
      }

      selectedTeamIds.add(value.teamId);
    }

    slots.add(value.slot);
    selections.push({
      slot: value.slot,
      gmName: getLockedGmName(value.slot),
      teamId: value.teamId
    });
  }

  return selections.toSorted((first, second) => first.slot - second.slot);
}

function isAssignedSelection(
  selection: FranchiseSelection
): selection is AssignedFranchiseSelection {
  return Boolean(selection.teamId);
}

function getLockedGmName(slot: number) {
  return DEFAULT_GM_DRAFT_ORDER[slot - 1] ?? `GM ${slot}`;
}

function isSelectionShape(value: unknown): value is FranchiseSelection {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    Number.isInteger(candidate.slot) &&
    typeof candidate.gmName === "string" &&
    (typeof candidate.teamId === "string" || candidate.teamId === null)
  );
}
