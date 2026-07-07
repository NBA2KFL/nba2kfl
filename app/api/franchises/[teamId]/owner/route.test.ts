import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDraftDbClient } from "@/lib/draft-db";
import {
  clearFranchiseOwner,
  ensureFranchiseSelectionSchema,
  loadFranchiseOwnership,
  seedGmDraftSlots,
  setFranchiseOwner
} from "@/lib/franchise-db";
import { PATCH } from "./route";

vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers())
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn()
    }
  }
}));

vi.mock("@/lib/draft-db", () => ({
  getDraftDbClient: vi.fn()
}));

vi.mock("@/lib/franchise-db", () => ({
  clearFranchiseOwner: vi.fn(),
  ensureFranchiseSelectionSchema: vi.fn(),
  loadFranchiseOwnership: vi.fn(),
  seedGmDraftSlots: vi.fn(),
  setFranchiseOwner: vi.fn()
}));

const db = { query: vi.fn() };
const ownershipState = {
  franchises: [],
  ownerOptions: []
};

describe("franchise owner API", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.ADMIN_EMAILS = "admin@nba2kfl.local";
    vi.mocked(getDraftDbClient).mockReturnValue(db);
    vi.mocked(loadFranchiseOwnership).mockResolvedValue(ownershipState);
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { email: "admin@nba2kfl.local" }
    });
  });

  it("sets a franchise owner for admins", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/franchises/bos/owner", {
        body: JSON.stringify({
          userId: "user-1",
          label: "Équipe principale",
          isPrimary: true
        }),
        method: "PATCH"
      }),
      { params: Promise.resolve({ teamId: "bos" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual(ownershipState);
    expect(ensureFranchiseSelectionSchema).toHaveBeenCalledWith(db);
    expect(seedGmDraftSlots).toHaveBeenCalledWith(db);
    expect(setFranchiseOwner).toHaveBeenCalledWith(
      db,
      "bos",
      "user-1",
      "Équipe principale",
      true
    );
    expect(loadFranchiseOwnership).toHaveBeenCalledWith(db, expect.any(Array));
  });

  it("clears a franchise owner for admins", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/franchises/bos/owner", {
        body: JSON.stringify({
          userId: null,
          label: null,
          isPrimary: false
        }),
        method: "PATCH"
      }),
      { params: Promise.resolve({ teamId: "bos" }) }
    );

    expect(response.status).toBe(200);
    expect(clearFranchiseOwner).toHaveBeenCalledWith(db, "bos");
    expect(setFranchiseOwner).not.toHaveBeenCalled();
  });

  it("rejects non-admin users", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { email: "gm@nba2kfl.local" }
    });

    const response = await PATCH(
      new Request("http://localhost/api/franchises/bos/owner", {
        body: JSON.stringify({
          userId: "user-1",
          label: "Équipe principale",
          isPrimary: true
        }),
        method: "PATCH"
      }),
      { params: Promise.resolve({ teamId: "bos" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toEqual({ error: "Acces admin requis." });
    expect(setFranchiseOwner).not.toHaveBeenCalled();
  });

  it("rejects invalid owner payloads before writing", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/franchises/bos/owner", {
        body: JSON.stringify({
          userId: 42,
          label: "Équipe principale",
          isPrimary: true
        }),
        method: "PATCH"
      }),
      { params: Promise.resolve({ teamId: "bos" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "Proprietaire de franchise invalide." });
    expect(setFranchiseOwner).not.toHaveBeenCalled();
  });

  it("rejects unknown franchise ids", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/franchises/unknown/owner", {
        body: JSON.stringify({
          userId: "user-1",
          label: "Équipe principale",
          isPrimary: true
        }),
        method: "PATCH"
      }),
      { params: Promise.resolve({ teamId: "unknown" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toEqual({ error: "Franchise introuvable." });
    expect(setFranchiseOwner).not.toHaveBeenCalled();
  });
});
