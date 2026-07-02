import { describe, expect, it } from "vitest";
import {
  DRAFT_LOTTERY_DATABASE_RESET_LOCKED,
  DRAFT_LOTTERY_GENERATION_LOCKED,
  DRAFT_LOTTERY_VIEW_RESET_LOCKED
} from "./lottery-lock";

describe("lottery locks", () => {
  it("blocks generation, database deletion, and front-only reset", () => {
    expect(DRAFT_LOTTERY_GENERATION_LOCKED).toBe(true);
    expect(DRAFT_LOTTERY_DATABASE_RESET_LOCKED).toBe(true);
    expect(DRAFT_LOTTERY_VIEW_RESET_LOCKED).toBe(true);
  });
});
