import { HttpError } from "../lib/http.js";
import {
  getCurrentTournamentSeason,
  listCurrentTournamentSeasons,
  listStandingsRows,
} from "../repositories/standingsRepository.js";
import { listTeamMappings } from "../repositories/teamRepository.js";

export async function getCurrentSeasons() {
  return listCurrentTournamentSeasons();
}

export async function getStandings(tournamentId, seasonId) {
  const currentSeason = await getCurrentTournamentSeason(tournamentId, seasonId);

  if (!currentSeason) {
    throw new HttpError(404, "Tournament season not found.");
  }

  const [rows, teamMappings] = await Promise.all([
    listStandingsRows(currentSeason.tournament_api_id, currentSeason.season_api_id),
    listTeamMappings(),
  ]);

  const teamIdByApiReference = new Map();

  for (const team of teamMappings) {
    teamIdByApiReference.set(String(team.api_id), team.id);
  }

  return rows.map((row, index) => ({
    id: row.standing_id,
    team_id:
      row.team_db_id ??
      teamIdByApiReference.get(String(row.team_id)) ??
      null,
    team_name: row.team_name || "Unknown Team",
    position: index + 1,
    matches: row.matches ?? 0,
    wins: row.wins ?? 0,
    draws: row.draws ?? 0,
    losses: row.losses ?? 0,
    goals_for: row.goals_for ?? 0,
    goals_against: row.goals_against ?? 0,
    goal_diff: row.goal_diff ?? 0,
    points: row.points ?? 0,
  }));
}
