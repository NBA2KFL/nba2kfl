export type Conference = "East" | "West";

export type Team = {
  id: string;
  name: string;
  abbreviation: string;
  nbaTeamId: number;
  logoUrl: string;
  conference: Conference;
};

const NBA_LOGO_SLUGS: Record<number, string> = {
  1610612737: "atl",
  1610612738: "bos",
  1610612739: "cle",
  1610612740: "nop",
  1610612741: "chi",
  1610612742: "dal",
  1610612743: "den",
  1610612744: "gsw",
  1610612745: "hou",
  1610612746: "lac",
  1610612747: "lal",
  1610612748: "mia",
  1610612749: "mil",
  1610612750: "min",
  1610612751: "bkn",
  1610612752: "nyk",
  1610612753: "orl",
  1610612754: "ind",
  1610612755: "phi",
  1610612756: "phx",
  1610612757: "por",
  1610612758: "sac",
  1610612759: "sas",
  1610612760: "okc",
  1610612761: "tor",
  1610612762: "uta",
  1610612763: "mem",
  1610612764: "was",
  1610612765: "det",
  1610612766: "cha"
};

function nbaLogoUrl(nbaTeamId: number) {
  return `/logos/nba/${NBA_LOGO_SLUGS[nbaTeamId]}.svg`;
}

export const NBA_TEAMS: Team[] = [
  {
    id: "bos",
    name: "Boston Celtics",
    abbreviation: "BOS",
    nbaTeamId: 1610612738,
    logoUrl: nbaLogoUrl(1610612738),
    conference: "East"
  },
  {
    id: "bkn",
    name: "Brooklyn Nets",
    abbreviation: "BKN",
    nbaTeamId: 1610612751,
    logoUrl: nbaLogoUrl(1610612751),
    conference: "East"
  },
  {
    id: "nyk",
    name: "New York Knicks",
    abbreviation: "NYK",
    nbaTeamId: 1610612752,
    logoUrl: nbaLogoUrl(1610612752),
    conference: "East"
  },
  {
    id: "phi",
    name: "Philadelphia 76ers",
    abbreviation: "PHI",
    nbaTeamId: 1610612755,
    logoUrl: nbaLogoUrl(1610612755),
    conference: "East"
  },
  {
    id: "tor",
    name: "Toronto Raptors",
    abbreviation: "TOR",
    nbaTeamId: 1610612761,
    logoUrl: nbaLogoUrl(1610612761),
    conference: "East"
  },
  {
    id: "chi",
    name: "Chicago Bulls",
    abbreviation: "CHI",
    nbaTeamId: 1610612741,
    logoUrl: nbaLogoUrl(1610612741),
    conference: "East"
  },
  {
    id: "cle",
    name: "Cleveland Cavaliers",
    abbreviation: "CLE",
    nbaTeamId: 1610612739,
    logoUrl: nbaLogoUrl(1610612739),
    conference: "East"
  },
  {
    id: "det",
    name: "Detroit Pistons",
    abbreviation: "DET",
    nbaTeamId: 1610612765,
    logoUrl: nbaLogoUrl(1610612765),
    conference: "East"
  },
  {
    id: "ind",
    name: "Indiana Pacers",
    abbreviation: "IND",
    nbaTeamId: 1610612754,
    logoUrl: nbaLogoUrl(1610612754),
    conference: "East"
  },
  {
    id: "mil",
    name: "Milwaukee Bucks",
    abbreviation: "MIL",
    nbaTeamId: 1610612749,
    logoUrl: nbaLogoUrl(1610612749),
    conference: "East"
  },
  {
    id: "atl",
    name: "Atlanta Hawks",
    abbreviation: "ATL",
    nbaTeamId: 1610612737,
    logoUrl: nbaLogoUrl(1610612737),
    conference: "East"
  },
  {
    id: "cha",
    name: "Charlotte Hornets",
    abbreviation: "CHA",
    nbaTeamId: 1610612766,
    logoUrl: nbaLogoUrl(1610612766),
    conference: "East"
  },
  {
    id: "mia",
    name: "Miami Heat",
    abbreviation: "MIA",
    nbaTeamId: 1610612748,
    logoUrl: nbaLogoUrl(1610612748),
    conference: "East"
  },
  {
    id: "orl",
    name: "Orlando Magic",
    abbreviation: "ORL",
    nbaTeamId: 1610612753,
    logoUrl: nbaLogoUrl(1610612753),
    conference: "East"
  },
  {
    id: "was",
    name: "Washington Wizards",
    abbreviation: "WAS",
    nbaTeamId: 1610612764,
    logoUrl: nbaLogoUrl(1610612764),
    conference: "East"
  },
  {
    id: "den",
    name: "Denver Nuggets",
    abbreviation: "DEN",
    nbaTeamId: 1610612743,
    logoUrl: nbaLogoUrl(1610612743),
    conference: "West"
  },
  {
    id: "min",
    name: "Minnesota Timberwolves",
    abbreviation: "MIN",
    nbaTeamId: 1610612750,
    logoUrl: nbaLogoUrl(1610612750),
    conference: "West"
  },
  {
    id: "okc",
    name: "Oklahoma City Thunder",
    abbreviation: "OKC",
    nbaTeamId: 1610612760,
    logoUrl: nbaLogoUrl(1610612760),
    conference: "West"
  },
  {
    id: "por",
    name: "Portland Trail Blazers",
    abbreviation: "POR",
    nbaTeamId: 1610612757,
    logoUrl: nbaLogoUrl(1610612757),
    conference: "West"
  },
  {
    id: "uta",
    name: "Utah Jazz",
    abbreviation: "UTA",
    nbaTeamId: 1610612762,
    logoUrl: nbaLogoUrl(1610612762),
    conference: "West"
  },
  {
    id: "gsw",
    name: "Golden State Warriors",
    abbreviation: "GSW",
    nbaTeamId: 1610612744,
    logoUrl: nbaLogoUrl(1610612744),
    conference: "West"
  },
  {
    id: "lac",
    name: "LA Clippers",
    abbreviation: "LAC",
    nbaTeamId: 1610612746,
    logoUrl: nbaLogoUrl(1610612746),
    conference: "West"
  },
  {
    id: "lal",
    name: "Los Angeles Lakers",
    abbreviation: "LAL",
    nbaTeamId: 1610612747,
    logoUrl: nbaLogoUrl(1610612747),
    conference: "West"
  },
  {
    id: "phx",
    name: "Phoenix Suns",
    abbreviation: "PHX",
    nbaTeamId: 1610612756,
    logoUrl: nbaLogoUrl(1610612756),
    conference: "West"
  },
  {
    id: "sac",
    name: "Sacramento Kings",
    abbreviation: "SAC",
    nbaTeamId: 1610612758,
    logoUrl: nbaLogoUrl(1610612758),
    conference: "West"
  },
  {
    id: "dal",
    name: "Dallas Mavericks",
    abbreviation: "DAL",
    nbaTeamId: 1610612742,
    logoUrl: nbaLogoUrl(1610612742),
    conference: "West"
  },
  {
    id: "hou",
    name: "Houston Rockets",
    abbreviation: "HOU",
    nbaTeamId: 1610612745,
    logoUrl: nbaLogoUrl(1610612745),
    conference: "West"
  },
  {
    id: "mem",
    name: "Memphis Grizzlies",
    abbreviation: "MEM",
    nbaTeamId: 1610612763,
    logoUrl: nbaLogoUrl(1610612763),
    conference: "West"
  },
  {
    id: "nop",
    name: "New Orleans Pelicans",
    abbreviation: "NOP",
    nbaTeamId: 1610612740,
    logoUrl: nbaLogoUrl(1610612740),
    conference: "West"
  },
  {
    id: "sas",
    name: "San Antonio Spurs",
    abbreviation: "SAS",
    nbaTeamId: 1610612759,
    logoUrl: nbaLogoUrl(1610612759),
    conference: "West"
  }
];
