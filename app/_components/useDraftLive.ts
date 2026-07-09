"use client";

import { useEffect, useRef } from "react";

const DRAFT_LIVE_FALLBACK_ERROR_COUNT = 3;
const DRAFT_LIVE_FALLBACK_INTERVAL_MS = 15000;

const REDRAFT_REFRESH_EVENT_TYPES = [
  "franchise_selection_changed",
  "redraft_pick_changed",
  "conflict_resolved"
] as const;

type DraftLiveOptions = {
  onRefresh: () => void | Promise<void>;
};

export function useDraftLive({ onRefresh }: DraftLiveOptions) {
  const lastEventIdRef = useRef(0);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;
    let consecutiveErrors = 0;

    function clearFallbackInterval() {
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
        fallbackInterval = null;
      }
    }

    function refresh() {
      void onRefresh();
    }

    function handleEvent(event: Event) {
      const message = event as MessageEvent<string>;
      const lastEventId = Number(message.lastEventId);

      if (Number.isFinite(lastEventId) && lastEventId > 0) {
        lastEventIdRef.current = lastEventId;
      }

      consecutiveErrors = 0;
      clearFallbackInterval();
      refresh();
    }

    eventSource = new EventSource(getDraftLiveUrl(lastEventIdRef.current));

    eventSource.onopen = () => {
      consecutiveErrors = 0;
      clearFallbackInterval();
    };

    eventSource.onerror = () => {
      consecutiveErrors = getNextDraftLiveErrorCount(consecutiveErrors);

      if (
        shouldStartDraftLiveFallback(consecutiveErrors) &&
        fallbackInterval === null
      ) {
        fallbackInterval = setInterval(refresh, DRAFT_LIVE_FALLBACK_INTERVAL_MS);
      }
    };

    for (const eventType of REDRAFT_REFRESH_EVENT_TYPES) {
      eventSource.addEventListener(eventType, handleEvent);
    }

    return () => {
      eventSource?.close();
      clearFallbackInterval();
    };
  }, [onRefresh]);
}

export function getDraftLiveUrl(lastEventId: number) {
  if (!Number.isFinite(lastEventId) || lastEventId <= 0) {
    return "/api/draft-events";
  }

  return `/api/draft-events?after=${Math.floor(lastEventId)}`;
}

export function getNextDraftLiveErrorCount(currentErrorCount: number) {
  return currentErrorCount + 1;
}

export function shouldStartDraftLiveFallback(errorCount: number) {
  return errorCount >= DRAFT_LIVE_FALLBACK_ERROR_COUNT;
}
