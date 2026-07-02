import { describe, expect, it, vi } from "vitest";
import { DELETE, POST } from "./route";

vi.mock("@/lib/draft-db", () => ({
  clearLatestDraftSimulation: vi.fn(),
  ensureDraftSimulationSchema: vi.fn(),
  getDraftDbClient: vi.fn(() => {
    throw new Error("Database should not be called while lottery is locked.");
  }),
  loadLatestDraftSimulation: vi.fn(),
  saveLatestDraftSimulation: vi.fn()
}));

describe("draft simulation API", () => {
  it("temporarily blocks generating a new lottery", async () => {
    const response = await POST();
    const payload = await response.json();

    expect(response.status).toBe(423);
    expect(payload).toEqual({
      error: "La génération d'une nouvelle lotterie est temporairement bloquée."
    });
  });

  it("temporarily blocks resetting the lottery", async () => {
    const response = await DELETE();
    const payload = await response.json();

    expect(response.status).toBe(423);
    expect(payload).toEqual({
      error: "La suppression du résultat sauvegardé est temporairement bloquée."
    });
  });
});
