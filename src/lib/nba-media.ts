export function getNbaTeamLogoUrl(nbaTeamId: number) {
  return `https://cdn.nba.com/logos/nba/${positiveId(nbaTeamId)}/primary/L/logo.svg`;
}

export function getNbaPlayerHeadshotUrl(nbaPlayerId: number) {
  return `https://cdn.nba.com/headshots/nba/latest/1040x760/${positiveId(nbaPlayerId)}.png`;
}

export function getPlayerPortraitUrl(
  nbaPlayerId: number | null,
  applicationUrl: string | undefined
) {
  if (nbaPlayerId !== null) {
    return getNbaPlayerHeadshotUrl(nbaPlayerId);
  }

  if (!applicationUrl) {
    return null;
  }

  try {
    const url = new URL(applicationUrl);

    if (url.protocol !== "https:") {
      return null;
    }

    return new URL("/images/player-silhouette.svg", url).toString();
  } catch {
    return null;
  }
}

function positiveId(value: number) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("NBA media id must be positive.");
  }

  return value;
}
