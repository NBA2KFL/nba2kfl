import { AppHeader } from "../../_components/AppHeader";
import { RedraftRoom } from "../../_components/RedraftRoom";

export default function RedraftPage() {
  return (
    <main className="app-shell">
      <AppHeader
        activeHref="/draft/redraft"
        description="Sélectionne les joueurs avec un ordre snake basé sur les franchises attribuées."
        eyebrow="NBA2KFL Draft Room"
        title="Redraft"
      />

      <section className="workflow-page" aria-label="Redraft joueurs">
        <RedraftRoom />
      </section>
    </main>
  );
}
