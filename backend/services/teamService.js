import { HttpError } from "../lib/http.js";
import {
  getLatestTeamStatsByApiId,
  getTeamById,
  getTeamProfileById,
  getTeamStatsByApiReferences,
  listTeams,
  listTeamSeasonsById,
} from "../repositories/teamRepository.js";
import { getTournamentSeason } from "../repositories/standingsRepository.js";

function sanitizeTeam(team, { includeCompetition = false } = {}) {
  if (!team) {
    return null;
  }

  const sanitizedTeam = {
    id: team.id,
    name: team.name,
    city: team.city,
    stadium: team.stadium,
    logo_url: team.logo_url,
    country: team.country ?? null,
    badge_label: team.badge_label ?? null,
    badge_is_current: Boolean(team.badge_is_current),
  };

  if (includeCompetition) {
    sanitizedTeam.tournament_id = team.tournament_id ?? null;
    sanitizedTeam.tournament_name = team.tournament_name ?? null;
  }

  return sanitizedTeam;
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
  const team = await getTeamProfileById(id);
  return sanitizeTeam(team, { includeCompetition: true });
}

export async function getTeamStats(id, seasonId) {
  const team =
    seasonId === undefined
      ? await getTeamById(id)
      : await getTeamProfileById(id);

  if (!team) {
    throw new HttpError(404, "Team not found.");
  }

  if (!team.api_id) {
    return null;
  }

  if (seasonId === undefined) {
    const stats = await getLatestTeamStatsByApiId(team.api_id);
    return sanitizeTeamStats(stats, team.id);
  }

  if (!team.tournament_id) {
    return null;
  }

  const tournamentSeason = await getTournamentSeason(team.tournament_id, seasonId);

  if (!tournamentSeason) {
    throw new HttpError(404, "Team season not found.");
  }

  const stats = await getTeamStatsByApiReferences(
    team.api_id,
    tournamentSeason.tournament_api_id,
    tournamentSeason.season_api_id,
  );

  return sanitizeTeamStats(stats, team.id);
}

export async function getTeamSeasons(id) {
  const team = await getTeamById(id);

  if (!team) {
    throw new HttpError(404, "Team not found.");
  }

  return listTeamSeasonsById(id, team.tournament_id ?? null);
}
