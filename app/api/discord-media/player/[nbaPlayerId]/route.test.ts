import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("Discord player media proxy", () => {
  it("returns the NBA headshot with cacheable image headers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(new Uint8Array([1, 2, 3]), {
          headers: { "content-type": "image/png" },
          status: 200
        })
      )
    );

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ nbaPlayerId: "1641705" })
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toContain("max-age");
    expect(fetch).toHaveBeenCalledWith(
      "https://cdn.nba.com/headshots/nba/latest/1040x760/1641705.png"
    );
    vi.unstubAllGlobals();
  });

  it("rejects invalid player ids", async () => {
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ nbaPlayerId: "not-an-id" })
    });

    expect(response.status).toBe(400);
  });
});
