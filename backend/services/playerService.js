import { HttpError } from "../lib/http.js";
import {
  getPlayerById,
  getLatestPlayerStatsByPlayerReferences,
  listPlayers,
  listPlayersByTeamReferences,
  listPlayersByTeamSeasonReferences,
} from "../repositories/playerRepository.js";
import {
  getTeamById,
  listTeamMappings,
  listTeamSeasonsById,
} from "../repositories/teamRepository.js";
import { listPlayerPositionsByPlayerIds } from "../repositories/searchRepository.js";

function buildTeamMaps(teamRows) {
  const teamByInternalId = new Map();
  const teamIdByAnyReference = new Map();
  const teamByAnyReference = new Map();

  for (const team of teamRows) {
    teamByInternalId.set(team.id, team);
    teamIdByAnyReference.set(String(team.id), team.id);
    teamByAnyReference.set(String(team.id), team);

    if (team.api_id !== null && team.api_id !== undefined) {
      teamIdByAnyReference.set(String(team.api_id), team.id);
      teamByAnyReference.set(String(team.api_id), team);
    }
  }

  return { teamByInternalId, teamIdByAnyReference, teamByAnyReference };
}

function resolveTeamByReference(teamMaps, reference) {
  if (reference === null || reference === undefined) {
    return null;
  }

  return teamMaps.teamByAnyReference.get(String(reference)) ?? null;
}

function sanitizePlayer(player, teamMaps, options = {}) {
  if (!player) {
    return null;
  }

  const { teamByInternalId, teamIdByAnyReference } = teamMaps;
  const teamReference = options.teamReference ?? player.team_id;
  const normalizedTeamId =
    teamIdByAnyReference.get(String(teamReference)) ?? null;
  const team =
    resolveTeamByReference(teamMaps, teamReference) ??
    teamByInternalId.get(normalizedTeamId) ??
    null;
  const { api_id, ...rest } = player;

  return {
    ...rest,
    team_id: normalizedTeamId,
    team_name: team?.name ?? null,
    tournament_name: team?.tournament_name ?? null,
    team_logo: team?.logo_url ?? null,
  };
}

function sanitizePlayerStats(stats) {
  if (!stats) {
    return null;
  }

  const {
    id,
    player_id,
    team_id,
    tournament_id,
    season_id,
    ...publicStats
  } = stats;

  return publicStats;
}

function selectDefaultSeason(seasons) {
  return seasons.find((season) => season.is_current) ?? seasons[0] ?? null;
}

async function listTeamSquadPlayers(team, seasonId) {
  return seasonId === undefined
    ? listPlayersByTeamReferences(team.id, team.api_id)
    : listPlayersByTeamSeasonReferences(team, seasonId);
}

export async function getTeamSquad(teamId, seasonId, options = {}) {
  const team = options.team ?? (await getTeamById(teamId));

  if (!team) {
    throw new HttpError(404, "Team not found.");
  }

  const teamMaps =
    options.teamMaps ??
    buildTeamMaps(await listTeamMappings({ includeTournament: true }));
  const players = await listTeamSquadPlayers(team, seasonId);

  return players.map((player) =>
    sanitizePlayer(player, teamMaps, { teamReference: team.id }),
  );
}

export async function getPlayerTeamSquads() {
  const teamRows = await listTeamMappings({ includeTournament: true });
  const teamMaps = buildTeamMaps(teamRows);
  const squads = await Promise.all(
    teamRows.map(async (team) => {
      const seasons = await listTeamSeasonsById(
        team.id,
        team.tournament_api_id ?? null,
      );
      const selectedSeason = selectDefaultSeason(seasons);
      const squad = await getTeamSquad(team.id, selectedSeason?.season_id, {
        team,
        teamMaps,
      });

      return {
        teamId: team.id,
        teamName: team.name,
        teamLogo: team.logo_url ?? null,
        tournamentId: selectedSeason?.tournament_id ?? team.tournament_id ?? null,
        tournamentName:
          selectedSeason?.tournament_name ?? team.tournament_name ?? null,
        seasonId: selectedSeason?.season_id ?? null,
        seasonName: selectedSeason?.season_name ?? null,
        players: squad,
      };
    }),
  );

  return squads.filter((squad) => squad.players.length > 0);
}

export async function getPlayers(teamId, seasonId) {
  if (teamId !== undefined) {
    return getTeamSquad(teamId, seasonId);
  }

  const teamRows = await listTeamMappings({ includeTournament: true });
  const teamMaps = buildTeamMaps(teamRows);
  const players = await listPlayers();
  return players.map((player) => sanitizePlayer(player, teamMaps));
}

export async function getPlayer(id) {
  const player = await getPlayerById(id);

  if (!player) {
    return null;
  }

  const [teamRows, playerStats] = await Promise.all([
    listTeamMappings({ includeTournament: true }),
    getLatestPlayerStatsByPlayerReferences(player),
  ]);
  const positionsByPlayerId = await listPlayerPositionsByPlayerIds([player.id]);
  const teamMaps = buildTeamMaps(teamRows);
  const sanitizedPlayer = sanitizePlayer(player, teamMaps, {
    teamReference: playerStats?.team_id ?? player.team_id,
  });

  return {
    ...sanitizedPlayer,
    position: positionsByPlayerId.get(player.id) ?? null,
    player_stats: playerStats ? [sanitizePlayerStats(playerStats)] : [],
  };
}
