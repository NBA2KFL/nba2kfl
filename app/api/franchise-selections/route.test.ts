import { describe, expect, it, vi, beforeEach } from "vitest";
import { getDraftDbClient } from "@/lib/draft-db";
import {
  clearFranchiseSelections,
  ensureFranchiseSelectionSchema,
  loadFranchiseSelections,
  seedGmDraftSlots,
  updateFranchiseSelection
} from "@/lib/franchise-db";
import { DELETE, GET, PATCH } from "./route";

vi.mock("@/lib/draft-db", () => ({
  getDraftDbClient: vi.fn()
}));

vi.mock("@/lib/franchise-db", () => ({
  clearFranchiseSelections: vi.fn(),
  ensureFranchiseSelectionSchema: vi.fn(),
  loadFranchiseSelections: vi.fn(),
  seedGmDraftSlots: vi.fn(),
  updateFranchiseSelection: vi.fn()
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

  it("updates one franchise selection and returns refreshed selections", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/franchise-selections", {
        body: JSON.stringify({ slot: 1, teamId: "bos" }),
        method: "PATCH"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ selections });
    expect(updateFranchiseSelection).toHaveBeenCalledWith(
      db,
      1,
      "bos",
      expect.any(Array)
    );
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
    expect(updateFranchiseSelection).not.toHaveBeenCalled();
  });

  it("returns conflict when a selected franchise is already taken", async () => {
    vi.mocked(updateFranchiseSelection).mockRejectedValue(
      Object.assign(new Error("duplicate team"), { code: "23505" })
    );

    const response = await PATCH(
      new Request("http://localhost/api/franchise-selections", {
        body: JSON.stringify({ slot: 1, teamId: "bos" }),
        method: "PATCH"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toEqual({ error: "Cette franchise est deja attribuee." });
  });

  it("clears franchise selections and returns refreshed selections", async () => {
    const response = await DELETE();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ selections });
    expect(clearFranchiseSelections).toHaveBeenCalledWith(db);
  });
});
