import { describe, expect, it } from "vitest";
import { APP_NAV_ITEMS } from "./navigation";

describe("APP_NAV_ITEMS", () => {
  it("exposes the three primary app pages in order", () => {
    expect(APP_NAV_ITEMS.map((item) => item.href)).toEqual([
      "/",
      "/lotterie",
      "/draft"
    ]);
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
