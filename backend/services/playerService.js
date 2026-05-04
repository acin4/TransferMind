import { HttpError } from "../lib/http.js";
import {
  getPlayerById,
  listPlayers,
  listPlayersByTeamReferences,
  listPlayersByTeamSeasonReferences,
} from "../repositories/playerRepository.js";
import {
  getTeamById,
  listTeamMappings,
  listTeamSeasonsById,
} from "../repositories/teamRepository.js";

function buildTeamMaps(teamRows) {
  const teamByInternalId = new Map();
  const teamIdByAnyReference = new Map();

  for (const team of teamRows) {
    teamByInternalId.set(team.id, team);
    teamIdByAnyReference.set(String(team.id), team.id);

    if (team.api_id !== null && team.api_id !== undefined) {
      teamIdByAnyReference.set(String(team.api_id), team.id);
    }
  }

  return { teamByInternalId, teamIdByAnyReference };
}

function sanitizePlayer(player, teamMaps) {
  if (!player) {
    return null;
  }

  const { teamByInternalId, teamIdByAnyReference } = teamMaps;
  const normalizedTeamId =
    teamIdByAnyReference.get(String(player.team_id)) ?? null;
  const team = teamByInternalId.get(normalizedTeamId) ?? null;
  const { api_id, ...rest } = player;

  return {
    ...rest,
    team_id: normalizedTeamId,
    team_name: team?.name ?? null,
    tournament_name: team?.tournament_name ?? null,
  };
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

  return players.map((player) => sanitizePlayer(player, teamMaps));
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
  const [player, teamRows] = await Promise.all([
    getPlayerById(id),
    listTeamMappings({ includeTournament: true }),
  ]);

  if (!player) {
    return null;
  }

  const teamMaps = buildTeamMaps(teamRows);
  return sanitizePlayer(player, teamMaps);
}
