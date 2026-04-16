import { HttpError } from "../lib/http.js";
import {
  getLatestTeamStatsByApiId,
  getTeamById,
  listTeams,
} from "../repositories/teamRepository.js";

function sanitizeTeam(team) {
  if (!team) {
    return null;
  }

  return {
    id: team.id,
    name: team.name,
    city: team.city,
    stadium: team.stadium,
    logo_url: team.logo_url,
  };
}

function sanitizeTeamStats(stats, teamId) {
  if (!stats) {
    return null;
  }

  const {
    team_id,
    tournament_id,
    season_id,
    ...rest
  } = stats;

  return {
    ...rest,
    team_id: teamId,
  };
}

export async function getTeams() {
  const teams = await listTeams();
  return teams.map(sanitizeTeam);
}

export async function getTeam(id) {
  const team = await getTeamById(id);
  return sanitizeTeam(team);
}

export async function getTeamStats(id) {
  const team = await getTeamById(id);

  if (!team) {
    throw new HttpError(404, "Team not found.");
  }

  if (!team.api_id) {
    return null;
  }

  const stats = await getLatestTeamStatsByApiId(team.api_id);
  return sanitizeTeamStats(stats, team.id);
}
