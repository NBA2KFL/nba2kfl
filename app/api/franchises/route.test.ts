import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDraftDbClient } from "@/lib/draft-db";
import {
  ensureFranchiseSelectionSchema,
  loadFranchiseOwnership,
  seedGmDraftSlots
} from "@/lib/franchise-db";
import { GET } from "./route";

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
  ensureFranchiseSelectionSchema: vi.fn(),
  loadFranchiseOwnership: vi.fn(),
  seedGmDraftSlots: vi.fn()
}));

const db = { query: vi.fn() };
const ownershipState = {
  franchises: [
    {
      teamId: "bos",
      owner: {
        userId: "user-1",
        email: "admin@nba2kfl.local",
        displayName: "Admin"
      },
      label: "Équipe principale",
      isPrimary: true,
      draftSlot: 1,
      draftGmName: "Anna"
    }
  ],
  ownerOptions: [
    {
      userId: "user-1",
      email: "admin@nba2kfl.local",
      displayName: "Admin"
    }
  ]
};

describe("franchise ownership API", () => {
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

  it("loads franchise ownership for admins", async () => {
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual(ownershipState);
    expect(ensureFranchiseSelectionSchema).toHaveBeenCalledWith(db);
    expect(seedGmDraftSlots).toHaveBeenCalledWith(db);
    expect(loadFranchiseOwnership).toHaveBeenCalledWith(db, expect.any(Array));
  });

  it("rejects non-admin users", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { email: "gm@nba2kfl.local" }
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toEqual({ error: "Acces admin requis." });
    expect(loadFranchiseOwnership).not.toHaveBeenCalled();
  });
});
