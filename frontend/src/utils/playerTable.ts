import type { PlayerListItem, TeamProfilePlayer } from "../api/api";
import { formatAgeFromBirthDate } from "./dateFormat";

type PlayerTableIdentity =
  | {
      id: number | string;
      slug?: string;
    }
  | {
      id?: number | string;
      slug: string;
    };

export type NormalizedPlayerTablePlayer = PlayerTableIdentity & {
  jerseyNumber: string;
  name: string;
  age: string;
  position: string;
  foot: string;
  nationality: string;
  photoUrl?: string | null;
  metadata?: string | null;
};

export type TeamSquadTablePlayer = NormalizedPlayerTablePlayer;

export type PlayersPageTablePlayer = NormalizedPlayerTablePlayer & {
  teamId?: number | string | null;
  teamName?: string | null;
};

export function normalizeTeamSquadPlayer(
  player: TeamProfilePlayer,
  teamName?: string | null,
): TeamSquadTablePlayer {
  return {
    id: player.id,
    slug: getOptionalStringField(player, "slug") ?? undefined,
    jerseyNumber: formatTableValue(player.jersey_num),
    name: formatName(player.name),
    age: formatAge(player.date_of_birth),
    position: formatTableValue(player.position),
    foot: formatTableValue(player.foot),
    nationality: formatTableValue(player.country?.name ?? player.nationality),
    photoUrl: player.photo_url ?? getOptionalStringField(player, "photo") ?? null,
    metadata: teamName ?? null,
  };
}

export function normalizePlayersPagePlayer(
  player: PlayerListItem,
  fallbackTeamName?: string | null,
): PlayersPageTablePlayer {
  const teamName =
    player.team_name ??
    getOptionalStringField(player, "teamName") ??
    fallbackTeamName ??
    null;

  return {
    id: player.id,
    slug: getOptionalStringField(player, "slug") ?? undefined,
    jerseyNumber: formatTableValue(player.jersey_num),
    name: formatName(player.name),
    age: formatAge(player.date_of_birth),
    position: formatTableValue(player.position),
    foot: formatTableValue(player.foot),
    nationality: formatTableValue(player.nationality),
    photoUrl:
      player.photo_url ??
      getOptionalStringField(player, "photo") ??
      null,
    metadata: teamName,
    teamId: player.team_id,
    teamName,
  };
}

export function getPlayerRouteKey(player: NormalizedPlayerTablePlayer) {
  return player.slug ?? player.id;
}

function formatName(value: string | null | undefined) {
  return formatTableValue(value);
}

function formatAge(dateOfBirth: string | null | undefined) {
  const age = formatAgeFromBirthDate(dateOfBirth);
  return age === "Unknown" ? "-" : age;
}

function formatTableValue(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

function getOptionalStringField(
  player: TeamProfilePlayer | PlayerListItem,
  fieldName: string,
) {
  const value = player[fieldName];
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : null;
}
