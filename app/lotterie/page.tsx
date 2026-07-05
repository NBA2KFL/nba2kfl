import { AppHeader } from "../_components/AppHeader";
import { LotterySimulator } from "../_components/LotterySimulator";
import { TeamPool } from "../_components/TeamPool";

export default function LotteryPage() {
  return (
    <main className="mx-auto w-[min(1240px,calc(100%-40px))] py-5 pb-10 max-[620px]:w-[min(100%-16px,1240px)] max-[620px]:pt-2.5">
      <AppHeader
        activeHref="/lotterie"
        description="Lance le tirage, vérifie les chances et prépare le workflow redraft."
        eyebrow="NBA2KFL Draft Room"
        title="Lotterie"
      />

      <section
        aria-label="Simulation de lotterie"
        className="mt-4 grid grid-cols-[minmax(0,1fr)_320px] gap-4 max-[1040px]:grid-cols-1"
      >
        <LotterySimulator />
        <TeamPool />
      </section>
    </main>
  );
}
