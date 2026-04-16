import { supabase } from "../lib/supabaseClient.js";

export async function listCurrentTournamentSeasons() {
  const { data, error } = await supabase
    .from("current_tournament_seasons")
    .select("tournament_id, season_id, season_name, year")
    .order("season_name", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getCurrentTournamentSeason(tournamentId, seasonId) {
  const { data, error } = await supabase
    .from("current_tournament_seasons")
    .select("tournament_id, season_id, tournament_api_id, season_api_id, season_name, year")
    .eq("tournament_id", tournamentId)
    .eq("season_id", seasonId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function listStandingsRows(tournamentApiId, seasonApiId) {
  const { data, error } = await supabase
    .from("standings_with_team_info")
    .select(
      [
        "standing_id",
        "team_id",
        "team_db_id",
        "team_name",
        "matches",
        "wins",
        "draws",
        "losses",
        "goals_for",
        "goals_against",
        "goal_diff",
        "points",
      ].join(","),
    )
    .eq("tournament_id", tournamentApiId)
    .eq("season_id", seasonApiId)
    .order("points", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}
