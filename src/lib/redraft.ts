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

export type RedraftPicksByNumber = Record<string, string>;

export type RedraftPickValidationResult =
  | { valid: true; playerName: string }
  | { valid: false; message: string };

export type GmDraftSlotLink = {
  slot: number;
  gmName: string;
  userName: string;
  userEmail: string;
};

export const REDRAFT_PLAYER_POOL_STORAGE_KEY = "nba2kfl:redraft-player-pool:v1";
export const REDRAFT_PICKS_STORAGE_KEY = "nba2kfl:redraft-picks:v1";

export const GM_DRAFT_SLOT_LINKS = [
  createGmDraftSlotLink(1, "Anna", "Anna"),
  createGmDraftSlotLink(2, "Ellias", "Ellias"),
  createGmDraftSlotLink(3, "Nico 2e équipe", "Nico"),
  createGmDraftSlotLink(4, "Clem 2e équipe", "Clem"),
  createGmDraftSlotLink(5, "Chris", "Chris"),
  createGmDraftSlotLink(6, "Math", "Mat Presti"),
  createGmDraftSlotLink(7, "Teepi", "Teepi"),
  createGmDraftSlotLink(8, "Akuma", "Akuma"),
  createGmDraftSlotLink(9, "Tony", "Tony"),
  createGmDraftSlotLink(10, "Adito", "Adito"),
  createGmDraftSlotLink(11, "Tamarlin", "Tamarlin"),
  createGmDraftSlotLink(12, "Tamarlin 2e équipe", "Tamarlin"),
  createGmDraftSlotLink(13, "Tony 2e équipe", "Tony"),
  createGmDraftSlotLink(14, "Paul", "Paul"),
  createGmDraftSlotLink(15, "Tomasninho", "Tomasninho"),
  createGmDraftSlotLink(16, "Nico", "Nico"),
  createGmDraftSlotLink(17, "Enzo", "Enzo"),
  createGmDraftSlotLink(18, "Sam", "Sam"),
  createGmDraftSlotLink(19, "ASL", "ASL"),
  createGmDraftSlotLink(20, "Khaladan", "Khaladan"),
  createGmDraftSlotLink(21, "Masai", "Masai"),
  createGmDraftSlotLink(22, "Diane", "Diane"),
  createGmDraftSlotLink(23, "Tidwa", "Tidwa"),
  createGmDraftSlotLink(24, "Laiku", "Laiku"),
  createGmDraftSlotLink(25, "Nortalis", "Nortalis"),
  createGmDraftSlotLink(26, "Romback", "Romback"),
  createGmDraftSlotLink(27, "Sparky", "Sparky"),
  createGmDraftSlotLink(28, "Clem", "Clem"),
  createGmDraftSlotLink(29, "Mat 2e équipe", "Mat Presti"),
  createGmDraftSlotLink(30, "Naoufel", "Naoufel")
] as const satisfies readonly GmDraftSlotLink[];

export const DEFAULT_GM_DRAFT_ORDER = GM_DRAFT_SLOT_LINKS.map(
  (slot) => slot.gmName
);

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

export function validateRedraftPickChange({
  draftPicks,
  pickNumber,
  picksByNumber,
  playerName,
  playerPool
}: {
  draftPicks: readonly SnakeDraftPick[];
  pickNumber: number;
  picksByNumber: RedraftPicksByNumber;
  playerName: string;
  playerPool: readonly string[];
}): RedraftPickValidationResult {
  const normalizedPlayerName = playerName.trim();
  const pickExists = draftPicks.some((pick) => pick.pickNumber === pickNumber);

  if (!pickExists) {
    return { valid: false, message: "Pick introuvable." };
  }

  if (!normalizedPlayerName) {
    return { valid: true, playerName: "" };
  }

  if (!playerPool.includes(normalizedPlayerName)) {
    return { valid: false, message: "Ce joueur n'est pas disponible." };
  }

  const duplicatePick = Object.entries(picksByNumber).find(
    ([storedPickNumber, storedPlayerName]) =>
      Number(storedPickNumber) !== pickNumber &&
      storedPlayerName === normalizedPlayerName
  );

  if (duplicatePick) {
    return { valid: false, message: "Ce joueur est deja pris." };
  }

  const currentPick = draftPicks.find(
    (pick) => !picksByNumber[pick.pickNumber]
  );

  if (
    currentPick &&
    !picksByNumber[pickNumber] &&
    currentPick.pickNumber !== pickNumber
  ) {
    return {
      valid: false,
      message: `Valide d'abord le pick #${currentPick.pickNumber}.`
    };
  }

  return { valid: true, playerName: normalizedPlayerName };
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

function createGmDraftSlotLink(
  slot: number,
  gmName: string,
  userName: string
): GmDraftSlotLink {
  return {
    slot,
    gmName,
    userName,
    userEmail: `${slugifyUserName(userName)}@nba2kfl.local`
  };
}

function slugifyUserName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
