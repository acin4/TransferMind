import { supabase } from "../lib/supabaseClient.js";
import { getSeasonEndYear, getSeasonLabel } from "../lib/seasonLabels.js";

export async function listCurrentTournamentSeasons() {
  const { data, error } = await supabase
    .from("current_tournament_seasons")
    .select(
      "tournament_id, season_id, tournament_api_id, season_api_id, season_name, year",
    )
    .order("season_name", { ascending: true });

  if (error) {
    throw error;
  }

  const seasons = data ?? [];

  if (seasons.length === 0) {
    return seasons;
  }

  const tournamentIds = [
    ...new Set(seasons.map((season) => season.tournament_id).filter(Boolean)),
  ];

  if (tournamentIds.length === 0) {
    return seasons;
  }

  const { data: tournaments, error: tournamentsError } = await supabase
    .from("tournaments")
    .select("id, name")
    .in("id", tournamentIds);

  if (tournamentsError) {
    throw tournamentsError;
  }

  const tournamentNameById = new Map(
    (tournaments ?? []).map((tournament) => [tournament.id, tournament.name]),
  );

  return seasons.map((season) => ({
    ...season,
    tournament_name:
      tournamentNameById.get(season.tournament_id) ??
      `Tournament ${season.tournament_id}`,
  }));
}

export async function getTournamentById(tournamentId) {
  const { data, error } = await supabase
    .from("tournaments")
    .select("id, api_id, name")
    .eq("id", tournamentId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function listTournamentSeasons(tournamentId) {
  const tournament = await getTournamentById(tournamentId);

  if (!tournament?.api_id) {
    return null;
  }

  const { data, error } = await supabase
    .from("seasons")
    .select("id, api_id, name, year, is_current")
    .eq("tournament_id", tournament.api_id);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((season) => ({
      season_id: season.id,
      season_api_id: season.api_id,
      season_name: getSeasonLabel(season),
      is_current: Boolean(season.is_current),
    }))
    .sort((a, b) => {
      const aEndYear = getSeasonEndYear(a);
      const bEndYear = getSeasonEndYear(b);

      if (aEndYear !== bEndYear) {
        return bEndYear - aEndYear;
      }

      return b.season_id - a.season_id;
    });
}

export async function getTournamentSeason(tournamentId, seasonId) {
  const tournament = await getTournamentById(tournamentId);

  if (!tournament?.api_id) {
    return null;
  }

  const { data, error } = await supabase
    .from("seasons")
    .select("id, api_id")
    .eq("id", seasonId)
    .eq("tournament_id", tournament.api_id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.api_id) {
    return null;
  }

  return {
    tournament_id: tournament.id,
    season_id: data.id,
    tournament_api_id: tournament.api_id,
    season_api_id: data.api_id,
  };
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
        "position",
        "matches",
        "wins",
        "draws",
        "losses",
        "goals_for",
        "goals_against",
        "goal_diff",
        "points",
        "standing_group_id",
        "standing_group_name",
        "stage_tournament_id",
        "stage_tournament_name",
        "stage_tournament_slug",
      ].join(","),
    )
    .eq("tournament_id", tournamentApiId)
    .eq("season_id", seasonApiId)
    .order("position", { ascending: true, nullsFirst: false })
    .order("points", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}
