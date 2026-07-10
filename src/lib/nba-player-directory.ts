export type NbaDirectoryPlayer = {
  nbaPlayerId: number;
  fullName: string;
};

const NBA_DIRECTORY_URL =
  "https://stats.nba.com/stats/commonallplayers";

export async function fetchNbaPlayerDirectory({
  season = process.env.NBA_STATS_SEASON?.trim() || "2025-26",
  fetchImpl = fetch
}: {
  season?: string;
  fetchImpl?: typeof fetch;
} = {}) {
  const url = new URL(NBA_DIRECTORY_URL);
  url.searchParams.set("LeagueID", "00");
  url.searchParams.set("Season", season);
  url.searchParams.set("IsOnlyCurrentSeason", "1");

  const response = await fetchImpl(url, {
    headers: {
      Origin: "https://www.nba.com",
      Referer: "https://www.nba.com/",
      "User-Agent": "Mozilla/5.0"
    }
  });

  if (!response.ok) {
    throw new Error(
      `NBA player directory request failed: ${response.status}.`
    );
  }

  return parseNbaPlayerDirectory(await response.json());
}

export function parseNbaPlayerDirectory(
  payload: unknown
): NbaDirectoryPlayer[] {
  if (!payload || typeof payload !== "object") {
    throw invalidPayloadError();
  }

  const resultSets = (payload as { resultSets?: unknown }).resultSets;

  if (!Array.isArray(resultSets) || resultSets.length === 0) {
    throw invalidPayloadError();
  }

  const resultSet = resultSets[0];

  if (!resultSet || typeof resultSet !== "object") {
    throw invalidPayloadError();
  }

  const headers = (resultSet as { headers?: unknown }).headers;
  const rowSet = (resultSet as { rowSet?: unknown }).rowSet;

  if (!Array.isArray(headers) || !Array.isArray(rowSet)) {
    throw invalidPayloadError();
  }

  const idIndex = headers.indexOf("PERSON_ID");
  const nameIndex = headers.indexOf("DISPLAY_FIRST_LAST");

  if (idIndex < 0 || nameIndex < 0) {
    throw invalidPayloadError();
  }

  return rowSet.map((row) => {
    if (!Array.isArray(row)) {
      throw invalidPayloadError();
    }

    const nbaPlayerId = Number(row[idIndex]);
    const fullName = row[nameIndex];

    if (
      !Number.isInteger(nbaPlayerId) ||
      nbaPlayerId <= 0 ||
      typeof fullName !== "string" ||
      fullName.trim() === ""
    ) {
      throw invalidPayloadError();
    }

    return {
      nbaPlayerId,
      fullName: fullName.trim()
    };
  });
}

export function normalizeNbaPlayerName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’'\-]/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function indexNbaPlayerIdsByName(
  players: readonly NbaDirectoryPlayer[]
) {
  return new Map(
    players.map((player) => [
      normalizeNbaPlayerName(player.fullName),
      player.nbaPlayerId
    ])
  );
}

function invalidPayloadError() {
  return new Error("NBA player directory returned an invalid payload.");
}
