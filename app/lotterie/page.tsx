import { LotterySimulator } from "../_components/LotterySimulator";
import { TeamPool } from "../_components/TeamPool";

export default function LotteryPage() {
  return (
    <section
      aria-label="Simulation de lotterie"
      className="mt-4 grid grid-cols-[minmax(0,1fr)_320px] gap-4 max-[1040px]:grid-cols-1"
    >
      <LotterySimulator />
      <TeamPool />
    </section>
  );
}
