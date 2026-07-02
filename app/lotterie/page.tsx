import { AppHeader } from "../_components/AppHeader";
import { LotterySimulator } from "../_components/LotterySimulator";
import { TeamPool } from "../_components/TeamPool";

export default function LotteryPage() {
  return (
    <main className="app-shell">
      <AppHeader
        activeHref="/lotterie"
        description="Lance le tirage, vérifie les chances et prépare le board de draft."
        eyebrow="NBA2KFL Draft Room"
        title="Lotterie"
      />

      <section className="workspace" aria-label="Simulation de lotterie">
        <LotterySimulator />
        <TeamPool />
      </section>
    </main>
  );
}
