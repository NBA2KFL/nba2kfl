import { describe, expect, it } from "vitest";
import {
  getDraftLiveUrl,
  getNextDraftLiveErrorCount,
  shouldStartDraftLiveFallback
} from "./useDraftLive";

describe("draft live SSE helpers", () => {
  it("uses the base draft events stream before an event cursor exists", () => {
    expect(getDraftLiveUrl(0)).toBe("/api/draft-events");
  });

  it("passes the last event cursor on reconnect", () => {
    expect(getDraftLiveUrl(12)).toBe("/api/draft-events?after=12");
  });

  it("starts fallback polling after repeated stream errors", () => {
    const firstErrorCount = getNextDraftLiveErrorCount(0);
    const thirdErrorCount = getNextDraftLiveErrorCount(2);

    expect(shouldStartDraftLiveFallback(firstErrorCount)).toBe(false);
    expect(shouldStartDraftLiveFallback(thirdErrorCount)).toBe(true);
  });
});
