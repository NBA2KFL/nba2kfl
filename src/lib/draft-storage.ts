import type { Team } from "@/data/teams";

export const DRAFT_SIMULATION_STORAGE_KEY = "nba2kfl:draft-simulation:v1";

type StoredDraftSimulation = {
  teamIds: string[];
  lastRunAt: string;
};

export type RestoredDraftSimulation = {
  draftOrder: Team[];
  lastRunAt: Date;
};

export function serializeDraftSimulation(
  draftOrder: readonly Team[],
  lastRunAt: Date
) {
  return JSON.stringify({
    teamIds: draftOrder.map((team) => team.id),
    lastRunAt: lastRunAt.toISOString()
  } satisfies StoredDraftSimulation);
}

export function parseDraftSimulation(
  storedValue: string | null,
  teams: readonly Team[]
): RestoredDraftSimulation | null {
  if (!storedValue) {
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(storedValue);
  } catch {
    return null;
  }

  if (!isStoredDraftSimulation(parsed)) {
    return null;
  }

  const lastRunAt = new Date(parsed.lastRunAt);

  if (Number.isNaN(lastRunAt.getTime())) {
    return null;
  }

  if (
    parsed.teamIds.length !== teams.length ||
    new Set(parsed.teamIds).size !== teams.length
  ) {
    return null;
  }

  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const draftOrder = parsed.teamIds.map((teamId) => teamsById.get(teamId));

  if (draftOrder.some((team) => team === undefined)) {
    return null;
  }

  return {
    draftOrder: draftOrder as Team[],
    lastRunAt
  };
}

function isStoredDraftSimulation(
  value: unknown
): value is StoredDraftSimulation {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    Array.isArray(candidate.teamIds) &&
    candidate.teamIds.every((teamId) => typeof teamId === "string") &&
    typeof candidate.lastRunAt === "string"
  );
}
