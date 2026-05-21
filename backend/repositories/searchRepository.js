import { supabase } from "../lib/supabaseClient.js";

const TEAM_SEARCH_SELECT = "id, name, city, stadium, logo_url";
const PLAYER_SEARCH_SELECT = "id, name, nationality, team_id, height";
const SEARCH_LIMIT = 8;
const SEARCH_CANDIDATE_LIMIT = 5000;

function addUniqueValue(values, value) {
  const cleanValue = String(value ?? "").trim();

  if (cleanValue && !values.includes(cleanValue)) {
    values.push(cleanValue);
  }
}

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

export async function listSearchTeamCandidates(
  limit = SEARCH_CANDIDATE_LIMIT,
) {
  const { data, error } = await supabase
    .from("teams")
    .select(TEAM_SEARCH_SELECT)
    .order("name", { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function listSearchPlayerCandidates(
  limit = SEARCH_CANDIDATE_LIMIT,
) {
  const { data, error } = await supabase
    .from("players")
    .select(PLAYER_SEARCH_SELECT)
    .order("name", { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function listTeamSearchMetadataByTeamIds(teamIds) {
  if (!Array.isArray(teamIds) || teamIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("standings_with_team_info")
    .select(
      "team_db_id, tournament_country, tournament_name, season_name, is_current",
    )
    .in("team_db_id", teamIds)
    .not("team_db_id", "is", null);

  if (error) {
    throw error;
  }

  const metadataByTeamId = new Map();

  for (const row of data ?? []) {
    if (!row.team_db_id) {
      continue;
    }

    const hadMetadata = metadataByTeamId.has(row.team_db_id);
    const existingMetadata = metadataByTeamId.get(row.team_db_id) ?? {
      country: null,
      tournamentName: null,
      seasonName: null,
      isCurrent: false,
      countries: [],
      tournamentNames: [],
      seasonNames: [],
    };
    const country = String(row.tournament_country ?? "").trim() || null;
    const tournamentName = String(row.tournament_name ?? "").trim() || null;
    const seasonName = String(row.season_name ?? "").trim() || null;

    addUniqueValue(existingMetadata.countries, country);
    addUniqueValue(existingMetadata.tournamentNames, tournamentName);
    addUniqueValue(existingMetadata.seasonNames, seasonName);

    const nextMetadata = {
      ...existingMetadata,
      country: String(row.tournament_country ?? "").trim() || null,
      tournamentName: String(row.tournament_name ?? "").trim() || null,
      seasonName: String(row.season_name ?? "").trim() || null,
      isCurrent: Boolean(row.is_current),
    };

    if (!hadMetadata || nextMetadata.isCurrent) {
      metadataByTeamId.set(row.team_db_id, nextMetadata);
    } else {
      metadataByTeamId.set(row.team_db_id, existingMetadata);
    }
  }

  return metadataByTeamId;
}

export async function listPlayerPositionsByPlayerIds(playerIds) {
  if (!Array.isArray(playerIds) || playerIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("player_positions")
    .select("player_id, positions(position)")
    .in("player_id", playerIds);

  if (error) {
    throw error;
  }

  const positionsByPlayerId = new Map();

  for (const row of data ?? []) {
    const position = row.positions?.position;

    if (!row.player_id || !position) {
      continue;
    }

    const existing = positionsByPlayerId.get(row.player_id);
    positionsByPlayerId.set(
      row.player_id,
      existing ? `${existing}, ${position}` : String(position),
    );
  }

  return positionsByPlayerId;
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
