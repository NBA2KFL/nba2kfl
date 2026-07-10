import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("Discord team media proxy", () => {
  it("returns the NBA logo with cacheable image headers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<svg></svg>", {
          headers: { "content-type": "image/svg+xml" },
          status: 200
        })
      )
    );

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ nbaTeamId: "1610612759" })
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/svg+xml");
    expect(response.headers.get("cache-control")).toContain("max-age");
    expect(fetch).toHaveBeenCalledWith(
      "https://cdn.nba.com/logos/nba/1610612759/primary/L/logo.svg"
    );
    vi.unstubAllGlobals();
  });

  it("rejects invalid team ids", async () => {
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ nbaTeamId: "0" })
    });

    expect(response.status).toBe(400);
  });
});
