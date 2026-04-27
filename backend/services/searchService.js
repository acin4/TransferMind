import {
  listTeamCountriesByTeamIds,
  searchPlayers,
  searchTeams,
} from "../repositories/searchRepository.js";
import { listTeamMappingsByReferences } from "../repositories/teamRepository.js";

const SEARCH_RESULT_LIMIT = 8;

function normalizeQuery(query) {
  return String(query ?? "").trim();
}

function buildTeamMaps(teamRows) {
  const teamByAnyReference = new Map();

  for (const team of teamRows ?? []) {
    teamByAnyReference.set(String(team.id), team);

    if (team.api_id !== null && team.api_id !== undefined) {
      teamByAnyReference.set(String(team.api_id), team);
    }
  }

  return teamByAnyReference;
}

function toSearchTeamResult(team, countriesByTeamId) {
  return {
    id: team.id,
    name: team.name,
    logo: team.logo_url ?? null,
    country: countriesByTeamId.get(team.id) ?? null,
    city: team.city ?? null,
    stadium: team.stadium ?? null,
  };
}

function toSearchPlayerResult(player, teamByAnyReference) {
  const team = teamByAnyReference.get(String(player.team_id));

  return {
    id: player.id,
    name: player.name,
    photo: null,
    position: null,
    nationality: player.nationality ?? null,
    teamId: team?.id ?? null,
    teamName: team?.name ?? null,
  };
}

export async function search(query) {
  const normalizedQuery = normalizeQuery(query);

  if (!normalizedQuery) {
    return {
      teams: [],
      players: [],
    };
  }

  const [teams, players] = await Promise.all([
    searchTeams(normalizedQuery, SEARCH_RESULT_LIMIT),
    searchPlayers(normalizedQuery, SEARCH_RESULT_LIMIT),
  ]);
  const [countriesByTeamId, teamRows] = await Promise.all([
    listTeamCountriesByTeamIds(teams.map((team) => team.id)),
    listTeamMappingsByReferences(players.map((player) => player.team_id)),
  ]);
  const teamByAnyReference = buildTeamMaps(teamRows);

  return {
    teams: teams.map((team) => toSearchTeamResult(team, countriesByTeamId)),
    players: players.map((player) =>
      toSearchPlayerResult(player, teamByAnyReference),
    ),
  };
}
