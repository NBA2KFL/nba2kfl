import { AppHeader } from "../_components/AppHeader";
import { DraftBoard } from "../_components/DraftBoard";
import { TeamPool } from "../_components/TeamPool";

export default function DraftPage() {
  return (
    <main className="app-shell">
      <AppHeader
        activeHref="/draft"
        description="Consulte et régénère l'ordre complet sauvegardé après la lotterie."
        eyebrow="NBA2KFL Draft Room"
        title="Draft"
      />

      <section className="workspace" aria-label="Board de draft">
        <DraftBoard />
        <TeamPool />
      </section>
    </main>
  );
}
