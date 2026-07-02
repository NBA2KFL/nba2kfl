import { NBA_TEAMS } from "@/data/teams";

const EAST_TEAMS = NBA_TEAMS.filter((team) => team.conference === "East");
const WEST_TEAMS = NBA_TEAMS.filter((team) => team.conference === "West");

export function TeamPool() {
  return (
    <aside className="team-pool" aria-labelledby="team-pool-title">
      <div className="side-panel-heading">
        <p className="section-label">Teams</p>
        <h2 id="team-pool-title">Équipes disponibles</h2>
      </div>

      <ConferenceGroup title="Conférence Est" teams={EAST_TEAMS} />
      <ConferenceGroup title="Conférence Ouest" teams={WEST_TEAMS} />
    </aside>
  );
}

function ConferenceGroup({
  title,
  teams
}: {
  title: string;
  teams: typeof NBA_TEAMS;
}) {
  return (
    <div className="conference-group">
      <h3>{title}</h3>
      <ul>
        {teams.map((team) => (
          <li key={team.id}>
            <img src={team.logoUrl} alt="" loading="lazy" />
            <span>{team.name}</span>
            <strong>{team.abbreviation}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
