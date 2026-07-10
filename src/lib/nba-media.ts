export function getNbaTeamLogoUrl(
  nbaTeamId: number,
  applicationUrl?: string
) {
  const publicOrigin = getPublicOrigin(applicationUrl);

  if (publicOrigin) {
    return `${publicOrigin}/api/discord-media/team/${positiveId(nbaTeamId)}`;
  }

  return getNbaTeamLogoSourceUrl(nbaTeamId);
}

export function getNbaTeamLogoSourceUrl(nbaTeamId: number) {
  return `https://cdn.nba.com/logos/nba/${positiveId(nbaTeamId)}/primary/L/logo.svg`;
}

export function getNbaPlayerHeadshotUrl(
  nbaPlayerId: number,
  applicationUrl?: string
) {
  const publicOrigin = getPublicOrigin(applicationUrl);

  if (publicOrigin) {
    return `${publicOrigin}/api/discord-media/player/${positiveId(nbaPlayerId)}`;
  }

  return getNbaPlayerHeadshotSourceUrl(nbaPlayerId);
}

export function getNbaPlayerHeadshotSourceUrl(nbaPlayerId: number) {
  return `https://cdn.nba.com/headshots/nba/latest/1040x760/${positiveId(nbaPlayerId)}.png`;
}

export function getPlayerPortraitUrl(
  nbaPlayerId: number | null,
  applicationUrl: string | undefined
) {
  if (nbaPlayerId !== null) {
    return getNbaPlayerHeadshotUrl(nbaPlayerId, applicationUrl);
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

function getPublicOrigin(applicationUrl: string | undefined) {
  if (!applicationUrl) {
    return null;
  }

  try {
    const url = new URL(applicationUrl);

    return url.protocol === "https:" ? url.origin : null;
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
