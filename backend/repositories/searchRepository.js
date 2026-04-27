import { supabase } from "../lib/supabaseClient.js";

const TEAM_SEARCH_SELECT = "id, name, city, stadium, logo_url";
const PLAYER_SEARCH_SELECT = "id, name, nationality, team_id";
const SEARCH_LIMIT = 8;

function buildSearchPattern(query) {
  return `%${query}%`;
}

function uniqueById(rows) {
  const rowsById = new Map();

  for (const row of rows ?? []) {
    if (!rowsById.has(row.id)) {
      rowsById.set(row.id, row);
    }
  }

  return [...rowsById.values()];
}

async function runTeamFieldSearch(fieldName, query, limit) {
  const { data, error } = await supabase
    .from("teams")
    .select(TEAM_SEARCH_SELECT)
    .ilike(fieldName, buildSearchPattern(query))
    .order("name", { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function runPlayerFieldSearch(fieldName, query, limit) {
  const { data, error } = await supabase
    .from("players")
    .select(PLAYER_SEARCH_SELECT)
    .ilike(fieldName, buildSearchPattern(query))
    .order("name", { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function searchTeams(query, limit = SEARCH_LIMIT) {
  const rows = await Promise.all([
    runTeamFieldSearch("name", query, limit),
    runTeamFieldSearch("city", query, limit),
    runTeamFieldSearch("stadium", query, limit),
  ]);

  return uniqueById(rows.flat())
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
    .slice(0, limit);
}

export async function searchPlayers(query, limit = SEARCH_LIMIT) {
  const rows = await Promise.all([
    runPlayerFieldSearch("name", query, limit),
    runPlayerFieldSearch("nationality", query, limit),
  ]);

  return uniqueById(rows.flat())
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
    .slice(0, limit);
}

export async function listTeamCountriesByTeamIds(teamIds) {
  if (!Array.isArray(teamIds) || teamIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("standings_with_team_info")
    .select("team_db_id, tournament_country, is_current")
    .in("team_db_id", teamIds)
    .not("team_db_id", "is", null);

  if (error) {
    throw error;
  }

  const countriesByTeamId = new Map();

  for (const row of data ?? []) {
    if (!row.team_db_id || !row.tournament_country) {
      continue;
    }

    const existing = countriesByTeamId.get(row.team_db_id);

    if (!existing || row.is_current) {
      countriesByTeamId.set(row.team_db_id, {
        country: String(row.tournament_country).trim() || null,
        isCurrent: Boolean(row.is_current),
      });
    }
  }

  return new Map(
    [...countriesByTeamId.entries()].map(([teamId, value]) => [
      teamId,
      value.country,
    ]),
  );
}
