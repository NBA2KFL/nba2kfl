import { cn } from "@/lib/utils";
import { NBA_TEAMS } from "@/data/teams";

const EAST_TEAMS = NBA_TEAMS.filter((team) => team.conference === "East");
const WEST_TEAMS = NBA_TEAMS.filter((team) => team.conference === "West");

export function TeamPool() {
  return (
    <aside
      aria-labelledby="team-pool-title"
      className="min-w-0 self-start overflow-hidden rounded-[18px] border border-command-border bg-command-surface p-4 shadow-[0_18px_48px_rgba(16,24,40,0.08)] max-[620px]:p-3"
    >
      <div className="-mx-4 -mt-4 mb-4 border-b border-command-border bg-command-surface px-4 py-4 max-[620px]:-mx-3 max-[620px]:-mt-3 max-[620px]:mb-3 max-[620px]:px-3 max-[620px]:py-3.5">
        <p className="mb-1 text-[0.64rem] font-[760] leading-none uppercase tracking-[0.14em] text-command-muted">
          Teams
        </p>
        <h2
          className="mb-2 text-[1.33rem] font-[730] leading-[1.08] tracking-[-0.045em] text-command-ink max-[620px]:text-[1.18rem]"
          id="team-pool-title"
        >
          Équipes disponibles
        </h2>
      </div>

      <ConferenceGroup title="Conférence Est" teams={EAST_TEAMS} />
      <ConferenceGroup className="mt-4" title="Conférence Ouest" teams={WEST_TEAMS} />
    </aside>
  );
}

function ConferenceGroup({
  className,
  title,
  teams
}: {
  className?: string;
  title: string;
  teams: typeof NBA_TEAMS;
}) {
  return (
    <div className={cn(className)}>
      <h3 className="mb-2 text-[0.64rem] font-[760] leading-none uppercase tracking-[0.13em] text-command-muted">
        {title}
      </h3>
      <ul className="m-0 grid list-none gap-1.5 p-0">
        {teams.map((team) => (
          <li
            className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-2 rounded-[10px] border border-transparent bg-command-surface-muted px-2.5 py-2 hover:border-command-border hover:bg-command-surface"
            key={team.id}
          >
            <img
              alt=""
              className="h-6 w-6 object-contain"
              loading="lazy"
              src={team.logoUrl}
            />
            <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[0.8rem] font-[660] text-command-ink">
              {team.name}
            </span>
            <strong className="text-[0.7rem] font-[720] text-command-muted">
              {team.abbreviation}
            </strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
