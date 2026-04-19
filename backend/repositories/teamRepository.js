import { supabase } from "../lib/supabaseClient.js";
import { getSeasonEndYear, getSeasonLabel } from "../lib/seasonLabels.js";

const TEAM_SELECT = "id, api_id, name, tournament_id, city, stadium, logo_url";
const PARTICIPATION_SELECT = [
  "team_db_id",
  "team_id",
  "tournament_id",
  "tournament_db_id",
  "tournament_name",
  "tournament_country",
  "season_id",
  "season_db_id",
  "season_name",
  "season_year",
  "is_current",
].join(",");

function getTeamsBaseQuery() {
  return supabase.from("teams").select(TEAM_SELECT);
}

function buildParticipationKey(row) {
  const teamKey = row.team_db_id ?? row.team_id;
  const tournamentKey = row.tournament_db_id ?? row.tournament_id;
  const seasonKey = row.season_db_id ?? row.season_id;

  return `${teamKey}::${tournamentKey}::${seasonKey}`;
}

function normalizeCountry(value) {
  if (value == null) {
    return null;
  }

  const text = String(value).trim();
  return text || null;
}

function compareParticipationRows(a, b, preferredTournamentApiId = null) {
  const currentDelta = Number(Boolean(b.is_current)) - Number(Boolean(a.is_current));

  if (currentDelta !== 0) {
    return currentDelta;
  }

  const endYearDelta = getSeasonEndYear(b) - getSeasonEndYear(a);

  if (endYearDelta !== 0) {
    return endYearDelta;
  }

  const seasonIdDelta = (b.season_db_id ?? -1) - (a.season_db_id ?? -1);

  if (seasonIdDelta !== 0) {
    return seasonIdDelta;
  }

  if (preferredTournamentApiId != null) {
    const preferredTournamentDelta =
      Number((b.tournament_id ?? null) === preferredTournamentApiId) -
      Number((a.tournament_id ?? null) === preferredTournamentApiId);

    if (preferredTournamentDelta !== 0) {
      return preferredTournamentDelta;
    }
  }

  return String(a.tournament_name ?? "").localeCompare(
    String(b.tournament_name ?? ""),
  );
}

function toBadgeLabel(row) {
  const seasonLabel = getSeasonLabel(row);
  const tournamentName = row.tournament_name?.trim() || null;

  if (!tournamentName || !seasonLabel) {
    return null;
  }

  return `${tournamentName} ${seasonLabel}`.toLocaleUpperCase();
}

function buildParticipationSummary(rows) {
  const uniqueRows = new Map();

  for (const row of rows ?? []) {
    if (!row?.team_db_id) {
      continue;
    }

    const key = buildParticipationKey(row);

    if (!uniqueRows.has(key)) {
      uniqueRows.set(key, row);
    }
  }

  const summaryByTeamId = new Map();

  for (const row of uniqueRows.values()) {
    const teamId = row.team_db_id;
    const existing = summaryByTeamId.get(teamId);

    if (!existing || compareParticipationRows(row, existing) < 0) {
      summaryByTeamId.set(teamId, row);
    }
  }

  return summaryByTeamId;
}

function dedupeParticipationRows(rows) {
  const uniqueRows = new Map();

  for (const row of rows ?? []) {
    if (!row?.team_db_id) {
      continue;
    }

    const key = buildParticipationKey(row);

    if (!uniqueRows.has(key)) {
      uniqueRows.set(key, row);
    }
  }

  return [...uniqueRows.values()];
}

function getPreferredParticipationRow(rows, preferredTournamentApiId = null) {
  let preferredRow = null;

  for (const row of dedupeParticipationRows(rows)) {
    if (
      !preferredRow ||
      compareParticipationRows(row, preferredRow, preferredTournamentApiId) < 0
    ) {
      preferredRow = row;
    }
  }

  return preferredRow;
}

async function getTournamentByApiId(apiId) {
  const { data, error } = await supabase
    .from("tournaments")
    .select("id, api_id, name")
    .eq("api_id", apiId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function listParticipationRowsByTeamId(teamId) {
  const { data, error } = await supabase
    .from("standings_with_team_info")
    .select(PARTICIPATION_SELECT)
    .eq("team_db_id", teamId)
    .not("tournament_db_id", "is", null);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function listTeams() {
  const query = getTeamsBaseQuery();
  const [{ data: teams, error }, { data: participationRows, error: participationError }] =
    await Promise.all([
      query.order("name", { ascending: true }),
      supabase
        .from("standings_with_team_info")
        .select(
          [
            "team_db_id",
            "team_id",
            "tournament_id",
            "tournament_db_id",
            "tournament_name",
            "tournament_country",
            "season_id",
            "season_db_id",
            "season_name",
            "season_year",
            "is_current",
          ].join(","),
        )
        .not("team_db_id", "is", null),
    ]);

  if (error) {
    throw error;
  }

  if (participationError) {
    throw participationError;
  }

  const nextTeams = teams ?? [];
  const teamTournamentApiIds = [
    ...new Set(nextTeams.map((team) => team.tournament_id).filter(Boolean)),
  ];

  let fallbackCountryByTournamentApiId = new Map();

  if (teamTournamentApiIds.length > 0) {
    const { data: tournaments, error: tournamentsError } = await supabase
      .from("tournaments")
      .select("api_id, country")
      .in("api_id", teamTournamentApiIds);

    if (tournamentsError) {
      throw tournamentsError;
    }

    fallbackCountryByTournamentApiId = new Map(
      (tournaments ?? []).map((tournament) => [
        tournament.api_id,
        normalizeCountry(tournament.country),
      ]),
    );
  }

  const summaryByTeamId = buildParticipationSummary(participationRows ?? []);

  return nextTeams.map((team) => {
    const participation = summaryByTeamId.get(team.id);

    return {
      ...team,
      country:
        normalizeCountry(participation?.tournament_country) ??
        fallbackCountryByTournamentApiId.get(team.tournament_id) ??
        null,
      badge_label: toBadgeLabel(participation),
      badge_is_current: Boolean(participation?.is_current),
    };
  });
}

export async function getTeamById(id) {
  const query = getTeamsBaseQuery();
  const { data, error } = await query.eq("id", id).maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getTeamProfileById(id) {
  const team = await getTeamById(id);

  if (!team) {
    return null;
  }

  const participationRows = await listParticipationRowsByTeamId(id);
  const preferredParticipation = getPreferredParticipationRow(
    participationRows,
    team.tournament_id ?? null,
  );

  if (preferredParticipation?.tournament_db_id) {
    return {
      ...team,
      tournament_id: preferredParticipation.tournament_db_id,
      tournament_name: preferredParticipation.tournament_name?.trim() || null,
    };
  }

  if (!team.tournament_id) {
    return {
      ...team,
      tournament_id: null,
      tournament_name: null,
    };
  }

  const fallbackTournament = await getTournamentByApiId(team.tournament_id);

  return {
    ...team,
    tournament_id: fallbackTournament?.id ?? null,
    tournament_name: fallbackTournament?.name?.trim() || null,
  };
}

export async function listTeamSeasonsById(teamId, preferredTournamentApiId = null) {
  const participationRows = await listParticipationRowsByTeamId(teamId);
  const preferredParticipation = getPreferredParticipationRow(
    participationRows,
    preferredTournamentApiId,
  );

  if (!preferredParticipation?.tournament_db_id) {
    return [];
  }

  const seasonsById = new Map();

  for (const row of dedupeParticipationRows(participationRows)) {
    if (
      row.tournament_db_id !== preferredParticipation.tournament_db_id ||
      !row.season_db_id
    ) {
      continue;
    }

    const nextSeason = {
      season_id: row.season_db_id,
      season_api_id: row.season_id ?? null,
      season_name: getSeasonLabel(row),
      is_current: Boolean(row.is_current),
    };
    const existingSeason = seasonsById.get(nextSeason.season_id);

    if (
      !existingSeason ||
      (nextSeason.is_current && !existingSeason.is_current) ||
      (!existingSeason.season_name && nextSeason.season_name)
    ) {
      seasonsById.set(nextSeason.season_id, nextSeason);
    }
  }

  return [...seasonsById.values()].sort((a, b) => {
    const aEndYear = getSeasonEndYear(a);
    const bEndYear = getSeasonEndYear(b);

    if (aEndYear !== bEndYear) {
      return bEndYear - aEndYear;
    }

    return b.season_id - a.season_id;
  });
}

export async function listTeamMappings() {
  const { data, error } = await supabase
    .from("teams")
    .select("id, api_id, name")
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getLatestTeamStatsByApiId(apiId) {
  const { data, error } = await supabase
    .from("team_stats")
    .select("*")
    .eq("team_id", apiId)
    .limit(1);

  if (error) {
    throw error;
  }

  return data?.[0] ?? null;
}

export async function getTeamStatsByApiReferences(
  teamApiId,
  tournamentApiId,
  seasonApiId,
) {
  const { data, error } = await supabase
    .from("team_stats")
    .select("*")
    .eq("team_id", teamApiId)
    .eq("tournament_id", tournamentApiId)
    .eq("season_id", seasonApiId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
}
