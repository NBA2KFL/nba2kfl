"use client";

import { useCallback, useEffect, useState } from "react";
import type { Team } from "@/data/teams";

type DraftSimulationApiResponse = {
  draftOrder: Team[];
  error?: string;
  lastRunAt: string | null;
};

export function useDraftSimulation() {
  const [draftOrder, setDraftOrder] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRunAt, setLastRunAt] = useState<Date | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadSimulation() {
      try {
        const payload = await requestDraftSimulation("GET");

        if (isActive) {
          applySimulationPayload(payload);
          setError(null);
        }
      } catch (requestError) {
        if (isActive) {
          setError(getErrorMessage(requestError));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadSimulation();

    return () => {
      isActive = false;
    };
  }, []);

  const applySimulationPayload = useCallback(
    (payload: DraftSimulationApiResponse) => {
      setDraftOrder(payload.draftOrder);
      setLastRunAt(payload.lastRunAt ? new Date(payload.lastRunAt) : null);
    },
    []
  );

  const runSimulation = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      applySimulationPayload(await requestDraftSimulation("POST"));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, [applySimulationPayload]);

  const resetSimulation = useCallback(async () => {
    setError(null);
    setDraftOrder([]);
    setLastRunAt(null);
  }, []);

  return {
    draftOrder,
    error,
    hasResult: draftOrder.length > 0,
    isLoading,
    lastRunAt,
    resetSimulation,
    runSimulation
  };
}

async function requestDraftSimulation(method: "DELETE" | "GET" | "POST") {
  const response = await fetch("/api/draft-simulation", {
    cache: "no-store",
    method
  });
  const payload = (await response.json()) as DraftSimulationApiResponse;

  if (!response.ok) {
    throw new Error(payload.error ?? "La base de données est indisponible.");
  }

  return payload;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "La base de données est indisponible.";
}
