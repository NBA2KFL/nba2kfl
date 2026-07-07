import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FranchiseOwnershipManagerView } from "./FranchiseOwnershipManager";

const franchises = [
  {
    teamId: "bos",
    owner: {
      userId: "user-1",
      email: "anna@nba2kfl.local",
      displayName: "Anna"
    },
    label: "Équipe principale",
    isPrimary: true,
    draftSlot: 1,
    draftGmName: "Anna"
  },
  {
    teamId: "lal",
    owner: null,
    label: null,
    isPrimary: false,
    draftSlot: 3,
    draftGmName: "Nico 2e équipe"
  }
];

const ownerOptions = [
  {
    userId: "user-1",
    email: "anna@nba2kfl.local",
    displayName: "Anna"
  },
  {
    userId: "user-2",
    email: "nico@nba2kfl.local",
    displayName: "Nico"
  }
];

describe("FranchiseOwnershipManagerView", () => {
  it("renders ownership separately from draft slot history", () => {
    const markup = renderToStaticMarkup(
      <FranchiseOwnershipManagerView
        errorMessage={null}
        franchises={franchises}
        isLoading={false}
        onChangeOwner={vi.fn()}
        ownerOptions={ownerOptions}
        savingTeamId={null}
      />
    );

    expect(markup).toContain("Boston Celtics");
    expect(markup).toContain("Anna");
    expect(markup).toContain("Équipe principale");
    expect(markup).toContain("#1 · Anna");
    expect(markup).toContain("Los Angeles Lakers");
    expect(markup).toContain("Sans propriétaire");
    expect(markup).toContain("#3 · Nico 2e équipe");
  });

  it("shows admin errors without rendering controls as active", () => {
    const markup = renderToStaticMarkup(
      <FranchiseOwnershipManagerView
        errorMessage="Acces admin requis."
        franchises={[]}
        isLoading={false}
        onChangeOwner={vi.fn()}
        ownerOptions={[]}
        savingTeamId={null}
      />
    );

    expect(markup).toContain("Acces admin requis.");
    expect(markup).toContain("Gestion proprietaires indisponible");
  });
});
