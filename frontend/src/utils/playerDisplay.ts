import type { PlayerListItem } from "../api/api";

export function getPlayerTeamName(player: PlayerListItem) {
  return (
    player.team_name ??
    getOptionalPlayerField(player, "teamName") ??
    null
  );
}

export function getPlayerTeamLogo(player: PlayerListItem) {
  return (
    getOptionalPlayerField(player, "team_logo") ??
    getOptionalPlayerField(player, "teamLogo")
  );
}

export function getPlayerStats(player: PlayerListItem) {
  return player.player_stats?.[0] ?? null;
}

export function getPlayerCommonStats(player: PlayerListItem) {
  return player.commonStats ?? {};
}

export function getPlayerOutfieldStats(player: PlayerListItem) {
  return player.outfieldStats ?? null;
}

export function getPlayerGoalkeeperStats(player: PlayerListItem) {
  return player.goalkeeperStats ?? null;
}

export function getOptionalPlayerField(
  player: PlayerListItem,
  fieldName: string,
) {
  const value = player[fieldName];
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : null;
}
