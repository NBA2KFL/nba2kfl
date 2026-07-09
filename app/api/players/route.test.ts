import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDraftDbClient } from "@/lib/draft-db";
import {
  ensureNba2kRosterSchema,
  loadNba2kRosterPlayers
} from "@/lib/nba2k-roster-db";
import { GET } from "./route";

vi.mock("@/lib/draft-db", () => ({
  getDraftDbClient: vi.fn()
}));

vi.mock("@/lib/nba2k-roster-db", () => ({
  ensureNba2kRosterSchema: vi.fn(),
  loadNba2kRosterPlayers: vi.fn()
}));

const db = { query: vi.fn() };
const players = [
  {
    sourcePlayerId: 1,
    fullName: "Joel Embiid",
    position: "C",
    rating: 92,
    teamId: "phi",
    teamName: "Philadelphia 76ers"
  }
];

describe("players API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDraftDbClient).mockReturnValue(db);
    vi.mocked(loadNba2kRosterPlayers).mockResolvedValue(players);
  });

  it("loads NBA 2K roster players", async () => {
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ players });
    expect(ensureNba2kRosterSchema).toHaveBeenCalledWith(db);
    expect(loadNba2kRosterPlayers).toHaveBeenCalledWith(db);
  });

  it("returns a French database error when players cannot be loaded", async () => {
    vi.mocked(getDraftDbClient).mockImplementation(() => {
      throw new Error("DATABASE_URL is required.");
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({
      error: "La base de donnees joueurs est indisponible."
    });
  });
});
