import {
  listPlayerPositionsByPlayerIds,
  listSearchPlayerCandidates,
  listSearchTeamCandidates,
  listTeamSearchMetadataByTeamIds,
} from "../repositories/searchRepository.js";
import { listTeamMappingsByReferences } from "../repositories/teamRepository.js";
import {
  filterAndRankSearchResults,
  normalizeSearchText,
} from "../lib/search.js";

const SEARCH_RESULT_LIMIT = 8;
const SEARCH_CANDIDATE_LIMIT = 5000;

function normalizeQuery(query) {
  return normalizeSearchText(query);
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

function toSearchTeamResult(team, teamMetadataByTeamId) {
  const metadata = teamMetadataByTeamId.get(team.id);

  return {
    id: team.id,
    name: team.name,
    logo: team.logo_url ?? null,
    country: metadata?.country ?? null,
    city: team.city ?? null,
    stadium: team.stadium ?? null,
    tournamentName: metadata?.tournamentName ?? null,
    seasonName: metadata?.seasonName ?? null,
  };
}

function toSearchPlayerResult(player, teamByAnyReference, positionsByPlayerId) {
  const team = teamByAnyReference.get(String(player.team_id));

  return {
    id: player.id,
    name: player.name,
    photo: null,
    position: positionsByPlayerId.get(player.id) ?? null,
    height: player.height ?? null,
    nationality: player.nationality ?? null,
    teamId: team?.id ?? null,
    teamName: team?.name ?? null,
  };
}

function getTeamSearchFields(team, teamMetadataByTeamId, query) {
  if (isShortHomeQuery(query)) {
    return [team.name];
  }

  const metadata = teamMetadataByTeamId.get(team.id);

  return [
    team.name,
    team.city,
    team.stadium,
    metadata?.country,
    metadata?.tournamentName,
    metadata?.seasonName,
    ...(metadata?.countries ?? []),
    ...(metadata?.tournamentNames ?? []),
    ...(metadata?.seasonNames ?? []),
  ];
}

function getPlayerSearchFields(
  player,
  teamByAnyReference,
  positionsByPlayerId,
  query,
) {
  if (isShortHomeQuery(query)) {
    return [player.name];
  }

  const team = teamByAnyReference.get(String(player.team_id));

  return [
    player.name,
    player.nationality,
    team?.name,
    positionsByPlayerId.get(player.id),
  ];
}

function isShortHomeQuery(query) {
  return normalizeSearchText(query).length <= 1;
}

export async function search(query) {
  const normalizedQuery = normalizeQuery(query);

  if (!normalizedQuery) {
    return {
      teams: [],
      players: [],
    };
  }

  const [teamCandidates, playerCandidates] = await Promise.all([
    listSearchTeamCandidates(SEARCH_CANDIDATE_LIMIT),
    listSearchPlayerCandidates(SEARCH_CANDIDATE_LIMIT),
  ]);
  const [teamMetadataByTeamId, teamRows, positionsByPlayerId] =
    await Promise.all([
      listTeamSearchMetadataByTeamIds(teamCandidates.map((team) => team.id)),
      listTeamMappingsByReferences(
        playerCandidates.map((player) => player.team_id),
      ),
      listPlayerPositionsByPlayerIds(
        playerCandidates.map((player) => player.id),
      ),
    ]);
  const teamByAnyReference = buildTeamMaps(teamRows);
  const teams = filterAndRankSearchResults(
    teamCandidates,
    normalizedQuery,
    (team) => getTeamSearchFields(team, teamMetadataByTeamId, normalizedQuery),
  ).slice(0, SEARCH_RESULT_LIMIT);
  const players = filterAndRankSearchResults(
    playerCandidates,
    normalizedQuery,
    (player) =>
      getPlayerSearchFields(
        player,
        teamByAnyReference,
        positionsByPlayerId,
        normalizedQuery,
      ),
  ).slice(0, SEARCH_RESULT_LIMIT);

  const rankedTeamMetadataByTeamId = new Map(
    teams.map((team) => [team.id, teamMetadataByTeamId.get(team.id)]),
  );
  const rankedTeamByAnyReference = buildTeamMaps([
    ...teamRows,
    ...teams.map((team) => ({
      id: team.id,
      api_id: team.api_id,
      name: team.name,
    })),
  ]);

  return {
    teams: teams.map((team) =>
      toSearchTeamResult(team, rankedTeamMetadataByTeamId),
    ),
    players: players.map((player) =>
      toSearchPlayerResult(player, rankedTeamByAnyReference, positionsByPlayerId),
    ),
  };
}
