import type { PlayerListItem, TeamProfilePlayer } from "../api/api";
import { formatAgeFromBirthDate } from "./dateFormat";

export type NormalizedPlayerRosterPlayer = {
  id: string;
  slug?: string;
  jerseyNumber: string;
  name: string;
  teamName: string | null;
  age: string;
  position: string;
  foot: string;
  nationality: string;
  teamId?: number | string | null;
};

export type TeamSquadRosterPlayer = NormalizedPlayerRosterPlayer;
export type PlayersPageRosterPlayer = NormalizedPlayerRosterPlayer;

export function normalizeTeamSquadPlayer(
  player: TeamProfilePlayer,
  teamName?: string | null,
): TeamSquadRosterPlayer {
  return normalizePlayer(player, teamName);
}

export function normalizePlayersPagePlayer(
  player: PlayerListItem,
  fallbackTeamName?: string | null,
): PlayersPageRosterPlayer {
  return {
    ...normalizePlayer(player, fallbackTeamName),
    teamId: player.team_id,
  };
}

export function getPlayerRouteKey(player: NormalizedPlayerRosterPlayer) {
  return player.slug ?? player.id;
}

export function normalizePlayer(
  player: TeamProfilePlayer | PlayerListItem,
  fallbackTeamName?: string | null,
): NormalizedPlayerRosterPlayer {
  const teamName =
    readString(player, "teamName") ??
    readString(player, "team_name") ??
    readString(player, "clubName") ??
    fallbackTeamName ??
    null;

  return {
    id: formatTableValue(
      readPrimitive(player, "id") ??
        readPrimitive(player, "playerId") ??
        readPrimitive(player, "player_id") ??
        readPrimitive(player, "name"),
    ),
    slug: readString(player, "slug") ?? undefined,
    jerseyNumber: formatTableValue(
      readPrimitive(player, "jerseyNumber") ??
        readPrimitive(player, "jersey_num") ??
        readPrimitive(player, "number") ??
        readPrimitive(player, "shirtNumber"),
    ),
    name: formatTableValue(
      readPrimitive(player, "name") ?? readPrimitive(player, "playerName"),
    ),
    teamName,
    age: getAge(player),
    position: formatPosition(
      readPrimitive(player, "position") ??
        readPrimitive(player, "positions") ??
        readPrimitive(player, "primaryPosition") ??
        readPrimitive(player, "role"),
    ),
    foot: formatTableValue(
      readPrimitive(player, "foot") ?? readPrimitive(player, "preferredFoot"),
    ),
    nationality: formatTableValue(
      readCountryName(player) ??
        readPrimitive(player, "nationality") ??
        readPrimitive(player, "country"),
    ),
  };
}

function formatAge(dateOfBirth: string | null | undefined) {
  const age = formatAgeFromBirthDate(dateOfBirth);
  return age === "Unknown" ? "-" : age;
}

function getAge(player: TeamProfilePlayer | PlayerListItem) {
  const age = readPrimitive(player, "age");

  if (age !== null) {
    return formatTableValue(age);
  }

  const dateOfBirth = readString(player, "date_of_birth");
  return formatAge(dateOfBirth);
}

function formatPosition(value: PrimitiveValue | null) {
  if (Array.isArray(value)) {
    return formatTableValue(value.filter(Boolean).join(", "));
  }

  return formatTableValue(value);
}

function formatTableValue(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

type PrimitiveValue = number | string | string[];

function readPrimitive(
  player: TeamProfilePlayer | PlayerListItem,
  fieldName: string,
): PrimitiveValue | null {
  const value = player[fieldName];

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    (Array.isArray(value) && value.every((item) => typeof item === "string"))
  ) {
    return value;
  }

  return null;
}

function readString(
  player: TeamProfilePlayer | PlayerListItem,
  fieldName: string,
) {
  const value = readPrimitive(player, fieldName);

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return value === null ? null : String(value);
}

function readCountryName(player: TeamProfilePlayer | PlayerListItem) {
  const country = player.country;

  if (typeof country === "string" || typeof country === "number") {
    return country;
  }

  if (
    typeof country === "object" &&
    country !== null &&
    "name" in country &&
    (typeof country.name === "string" || typeof country.name === "number")
  ) {
    return country.name;
  }

  return null;
}
