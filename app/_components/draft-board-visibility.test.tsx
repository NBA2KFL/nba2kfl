import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FranchiseSelectionBoard } from "./FranchiseSelectionBoard";
import { LotterySimulator } from "./LotterySimulator";
import { RedraftRoom } from "./RedraftRoom";

describe("visible draft board links", () => {
  it("does not expose the draft board route from workflow components", () => {
    const markup = [
      renderToStaticMarkup(<LotterySimulator />),
      renderToStaticMarkup(<FranchiseSelectionBoard />),
      renderToStaticMarkup(<RedraftRoom />)
    ].join("");

    expect(markup).not.toContain('href="/draft"');
    expect(markup).not.toContain("Board draft");
    expect(markup).not.toContain("Voir la draft");
    expect(markup).not.toContain("Joueurs disponibles");
  });
});
