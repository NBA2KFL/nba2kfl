import type { DraftDbClient } from "./draft-db";
import {
  fetchNbaPlayerDirectory,
  indexNbaPlayerIdsByName,
  normalizeNbaPlayerName
} from "./nba-player-directory";
import {
  loadRosterPlayerIdentities,
  updateRosterNbaPlayerIds
} from "./nba2k-roster-db";

export async function syncNbaPlayerIds(db: DraftDbClient) {
  try {
    const directoryPlayers = await fetchNbaPlayerDirectory();
    const rosterPlayers = await loadRosterPlayerIdentities(db);
    const nbaPlayerIdsByName = indexNbaPlayerIdsByName(directoryPlayers);
    const matches = rosterPlayers.flatMap((player) => {
      const nbaPlayerId = nbaPlayerIdsByName.get(
        normalizeNbaPlayerName(player.fullName)
      );

      if (!nbaPlayerId) {
        return [];
      }

      return [{ sourcePlayerId: player.sourcePlayerId, nbaPlayerId }];
    });
    const updateResult = await updateRosterNbaPlayerIds(db, matches);

    return {
      directoryPlayers: directoryPlayers.length,
      matchedPlayers: matches.length,
      unmatchedPlayers: rosterPlayers.length - matches.length,
      updatedPlayers: updateResult.updatedPlayers
    };
  } catch (error) {
    return {
      directoryPlayers: 0,
      matchedPlayers: 0,
      unmatchedPlayers: 0,
      updatedPlayers: 0,
      error: error instanceof Error ? error.message : "NBA media sync failed."
    };
  }
}
