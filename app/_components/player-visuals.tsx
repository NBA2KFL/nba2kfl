import type { ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const PLAYER_SILHOUETTE_URL = "/images/player-silhouette.svg";

const POSITION_COLOR_CLASSES: Record<string, string> = {
  PG: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  SG: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  SF: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  PF: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  C: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300"
};

export function getPlayerPhotoUrl(nbaPlayerId: number | null) {
  return nbaPlayerId
    ? `/api/discord-media/player/${nbaPlayerId}`
    : PLAYER_SILHOUETTE_URL;
}

export function getRatingTileClasses(rating: number) {
  if (rating >= 90) {
    return "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white";
  }

  if (rating >= 80) {
    return "bg-gradient-to-br from-indigo-400 to-indigo-600 text-white";
  }

  if (rating >= 70) {
    return "bg-gradient-to-br from-amber-400 to-amber-600 text-white";
  }

  return "bg-gradient-to-br from-slate-400 to-slate-600 text-white";
}

export function getPrimaryPosition(position: string | null) {
  return position?.split(/[/|,]/)[0]?.trim().toUpperCase() ?? null;
}

export function getPositionChipClasses(position: string | null) {
  const primary = getPrimaryPosition(position);

  return primary ? (POSITION_COLOR_CLASSES[primary] ?? "") : "";
}

type PlayerAvatarProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  nbaPlayerId: number | null;
};

export function PlayerAvatar({ className, nbaPlayerId, ...props }: PlayerAvatarProps) {
  return (
    <img
      alt=""
      className={cn(
        "shrink-0 rounded-full border border-command-border bg-command-surface-muted object-cover",
        className
      )}
      loading="lazy"
      onError={(event) => {
        if (event.currentTarget.src.endsWith(PLAYER_SILHOUETTE_URL)) {
          return;
        }

        event.currentTarget.src = PLAYER_SILHOUETTE_URL;
      }}
      src={getPlayerPhotoUrl(nbaPlayerId)}
      {...props}
    />
  );
}
