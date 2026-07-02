"use client";

import { useCallback, useEffect, useState } from "react";
import { NBA_TEAMS, type Team } from "@/data/teams";
import { shuffleTeams } from "@/lib/draft";
import {
  DRAFT_SIMULATION_STORAGE_KEY,
  parseDraftSimulation,
  serializeDraftSimulation
} from "@/lib/draft-storage";

export function useDraftSimulation() {
  const [draftOrder, setDraftOrder] = useState<Team[]>([]);
  const [lastRunAt, setLastRunAt] = useState<Date | null>(null);

  useEffect(() => {
    const restored = parseDraftSimulation(
      window.localStorage.getItem(DRAFT_SIMULATION_STORAGE_KEY),
      NBA_TEAMS
    );

    if (restored) {
      setDraftOrder(restored.draftOrder);
      setLastRunAt(restored.lastRunAt);
    }
  }, []);

  const runSimulation = useCallback(() => {
    const nextOrder = shuffleTeams(NBA_TEAMS);
    const nextRunAt = new Date();

    setDraftOrder(nextOrder);
    setLastRunAt(nextRunAt);
    window.localStorage.setItem(
      DRAFT_SIMULATION_STORAGE_KEY,
      serializeDraftSimulation(nextOrder, nextRunAt)
    );
  }, []);

  const resetSimulation = useCallback(() => {
    setDraftOrder([]);
    setLastRunAt(null);
    window.localStorage.removeItem(DRAFT_SIMULATION_STORAGE_KEY);
  }, []);

  return {
    draftOrder,
    hasResult: draftOrder.length > 0,
    lastRunAt,
    resetSimulation,
    runSimulation
  };
}
