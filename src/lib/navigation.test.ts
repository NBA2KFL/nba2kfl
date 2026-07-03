import { describe, expect, it } from "vitest";
import { APP_NAV_ITEMS, PRIMARY_APP_NAV_ITEMS } from "./navigation";

describe("APP_NAV_ITEMS", () => {
  it("exposes the draft workflow pages in order", () => {
    expect(APP_NAV_ITEMS.map((item) => item.href)).toEqual([
      "/",
      "/lotterie",
      "/draft/franchises",
      "/draft/redraft",
      "/sign-in"
    ]);
  });

  it("does not expose the draft board as a visible front route", () => {
    expect(PRIMARY_APP_NAV_ITEMS.map((item) => item.href)).toEqual([
      "/lotterie",
      "/draft/franchises",
      "/draft/redraft"
    ]);
    expect(APP_NAV_ITEMS.some((item) => item.href === "/draft")).toBe(false);
  });

  it("keeps navigation labels and hrefs unique", () => {
    expect(new Set(APP_NAV_ITEMS.map((item) => item.href)).size).toBe(
      APP_NAV_ITEMS.length
    );
    expect(new Set(APP_NAV_ITEMS.map((item) => item.label)).size).toBe(
      APP_NAV_ITEMS.length
    );
  });
});
