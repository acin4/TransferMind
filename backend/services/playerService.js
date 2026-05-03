import { HttpError } from "../lib/http.js";
import {
  getPlayerById,
  listPlayers,
  listPlayersByTeamReferences,
  listPlayersByTeamSeasonReferences,
} from "../repositories/playerRepository.js";
import { getTeamById, listTeamMappings } from "../repositories/teamRepository.js";

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

function sanitizePlayer(player, teamIdByAnyReference) {
  if (!player) {
    return null;
  }

  const normalizedTeamId = teamIdByAnyReference.get(String(player.team_id)) ?? null;
  const { api_id, ...rest } = player;

  return {
    ...rest,
    team_id: normalizedTeamId,
  };
}

export async function getPlayers(teamId, seasonId) {
  const teamRows = await listTeamMappings();
  const { teamIdByAnyReference } = buildTeamMaps(teamRows);

  if (teamId !== undefined) {
    const team = await getTeamById(teamId);

    if (!team) {
      throw new HttpError(404, "Team not found.");
    }

    const players =
      seasonId === undefined
        ? await listPlayersByTeamReferences(team.id, team.api_id)
        : await listPlayersByTeamSeasonReferences(team, seasonId);

    return players.map((player) => sanitizePlayer(player, teamIdByAnyReference));
  }

  const players = await listPlayers();
  return players.map((player) => sanitizePlayer(player, teamIdByAnyReference));
}

export async function getPlayer(id) {
  const [player, teamRows] = await Promise.all([
    getPlayerById(id),
    listTeamMappings(),
  ]);

  if (!player) {
    return null;
  }

  const { teamIdByAnyReference } = buildTeamMaps(teamRows);
  return sanitizePlayer(player, teamIdByAnyReference);
}
