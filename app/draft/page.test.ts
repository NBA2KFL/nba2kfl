import { redirect } from "next/navigation";
import { describe, expect, it, vi } from "vitest";
import DraftPage from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("redirected");
  })
}));

describe("DraftPage", () => {
  it("redirects the hidden draft board route to franchise selection", () => {
    expect(() => DraftPage()).toThrow("redirected");
    expect(redirect).toHaveBeenCalledWith("/draft/franchises");
  });
});
