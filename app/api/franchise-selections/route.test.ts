import { describe, expect, it, vi, beforeEach } from "vitest";
import { getDraftDbClient } from "@/lib/draft-db";
import {
  ensureFranchiseSelectionSchema,
  loadFranchiseSelections,
  seedGmDraftSlots
} from "@/lib/franchise-db";
import { DELETE, GET, PATCH } from "./route";

vi.mock("@/lib/draft-db", () => ({
  getDraftDbClient: vi.fn()
}));

vi.mock("@/lib/franchise-db", () => ({
  ensureFranchiseSelectionSchema: vi.fn(),
  loadFranchiseSelections: vi.fn(),
  seedGmDraftSlots: vi.fn()
}));

const db = { query: vi.fn() };
const selections = [
  { slot: 1, gmName: "Anna", teamId: "bos" },
  { slot: 2, gmName: "Ellias", teamId: null }
];

describe("franchise selections API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDraftDbClient).mockReturnValue(db);
    vi.mocked(loadFranchiseSelections).mockResolvedValue(selections);
  });

  it("loads seeded franchise selections", async () => {
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ selections });
    expect(ensureFranchiseSelectionSchema).toHaveBeenCalledWith(db);
    expect(seedGmDraftSlots).toHaveBeenCalledWith(db);
    expect(loadFranchiseSelections).toHaveBeenCalledWith(db, expect.any(Array));
  });

  it("rejects franchise selection updates while selections are locked", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/franchise-selections", {
        body: JSON.stringify({ slot: 1, teamId: "bos" }),
        method: "PATCH"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(423);
    expect(payload).toEqual({
      error: "La selection des franchises est verrouillee."
    });
    expect(getDraftDbClient).not.toHaveBeenCalled();
  });

  it("rejects invalid update payloads before writing", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/franchise-selections", {
        body: JSON.stringify({ slot: 31, teamId: "bos" }),
        method: "PATCH"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "Selection de franchise invalide." });
  });

  it("rejects franchise selection resets while selections are locked", async () => {
    const response = await DELETE();
    const payload = await response.json();

    expect(response.status).toBe(423);
    expect(payload).toEqual({
      error: "La selection des franchises est verrouillee."
    });
    expect(getDraftDbClient).not.toHaveBeenCalled();
  });
});
