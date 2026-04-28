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

function buildTeamComparisonSeasons(rows) {
  const seasonsByContext = new Map();

  for (const row of dedupeParticipationRows(rows)) {
    if (!row.tournament_db_id || !row.season_db_id) {
      continue;
    }

    const nextSeason = {
      key: buildParticipationKey(row),
      season_id: row.season_db_id,
      season_api_id: row.season_id ?? null,
      season_name: getSeasonLabel(row),
      tournament_id: row.tournament_db_id ?? null,
      tournament_api_id: row.tournament_id ?? null,
      tournament_name: row.tournament_name?.trim() || null,
      is_current: Boolean(row.is_current),
    };
    const existingSeason = seasonsByContext.get(nextSeason.key);

    if (
      !existingSeason ||
      (nextSeason.is_current && !existingSeason.is_current) ||
      (!existingSeason.season_name && nextSeason.season_name) ||
      (!existingSeason.tournament_name && nextSeason.tournament_name)
    ) {
      seasonsByContext.set(nextSeason.key, nextSeason);
    }
  }

  return [...seasonsByContext.values()].sort((a, b) => {
    const tournamentDelta = String(a.tournament_name ?? "").localeCompare(
      String(b.tournament_name ?? ""),
    );

    if (tournamentDelta !== 0) {
      return tournamentDelta;
    }

    const aEndYear = getSeasonEndYear(a);
    const bEndYear = getSeasonEndYear(b);

    if (aEndYear !== bEndYear) {
      return bEndYear - aEndYear;
    }

    return b.season_id - a.season_id;
  });
}

function buildStatsKey(teamApiId, tournamentApiId, seasonApiId) {
  return `${teamApiId}::${tournamentApiId}::${seasonApiId}`;
}

async function listTeamStatsByApiReferences(references) {
  const teamApiIds = [
    ...new Set(references.map((reference) => reference.teamApiId).filter(Boolean)),
  ];
  const tournamentApiIds = [
    ...new Set(
      references.map((reference) => reference.tournamentApiId).filter(Boolean),
    ),
  ];
  const seasonApiIds = [
    ...new Set(references.map((reference) => reference.seasonApiId).filter(Boolean)),
  ];

  if (
    teamApiIds.length === 0 ||
    tournamentApiIds.length === 0 ||
    seasonApiIds.length === 0
  ) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("team_stats")
    .select("*")
    .in("team_id", teamApiIds)
    .in("tournament_id", tournamentApiIds)
    .in("season_id", seasonApiIds);

  if (error) {
    throw error;
  }

  return new Map(
    (data ?? []).map((stats) => [
      buildStatsKey(stats.team_id, stats.tournament_id, stats.season_id),
      stats,
    ]),
  );
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
      tournament_id: row.tournament_db_id ?? null,
      tournament_name: row.tournament_name?.trim() || null,
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

export async function listTeamMappingsByReferences(teamReferences) {
  const references = [
    ...new Set(
      (teamReferences ?? [])
        .map((reference) => Number(reference))
        .filter((reference) => Number.isFinite(reference)),
    ),
  ];

  if (references.length === 0) {
    return [];
  }

  const [teamsByInternalId, teamsByApiId] = await Promise.all([
    supabase
      .from("teams")
      .select("id, api_id, name")
      .in("id", references),
    supabase
      .from("teams")
      .select("id, api_id, name")
      .in("api_id", references),
  ]);

  if (teamsByInternalId.error) {
    throw teamsByInternalId.error;
  }

  if (teamsByApiId.error) {
    throw teamsByApiId.error;
  }

  const teamsById = new Map();

  for (const team of [
    ...(teamsByInternalId.data ?? []),
    ...(teamsByApiId.data ?? []),
  ]) {
    teamsById.set(team.id, team);
  }

  return [...teamsById.values()];
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

export async function listTeamsComparisonDatasetRows() {
  const [{ data: teams, error }, { data: participationRows, error: participationError }] =
    await Promise.all([
      getTeamsBaseQuery().order("name", { ascending: true }),
      supabase
        .from("standings_with_team_info")
        .select(PARTICIPATION_SELECT)
        .not("team_db_id", "is", null)
        .not("tournament_db_id", "is", null),
    ]);

  if (error) {
    throw error;
  }

  if (participationError) {
    throw participationError;
  }

  const participationRowsByTeamId = new Map();

  for (const row of participationRows ?? []) {
    const teamId = row.team_db_id;

    if (!teamId) {
      continue;
    }

    const rows = participationRowsByTeamId.get(teamId) ?? [];
    rows.push(row);
    participationRowsByTeamId.set(teamId, rows);
  }

  const entries = [];
  const statsReferences = [];

  for (const team of teams ?? []) {
    const teamParticipationRows = participationRowsByTeamId.get(team.id) ?? [];
    const seasons = buildTeamComparisonSeasons(teamParticipationRows);

    for (const season of seasons) {
      const entry = {
        team_id: team.id,
        team_api_id: team.api_id ?? null,
        team_name: team.name,
        team_logo: team.logo_url ?? null,
        tournament_id: season.tournament_id,
        tournament_api_id: season.tournament_api_id,
        tournament_name: season.tournament_name,
        season_id: season.season_id,
        season_api_id: season.season_api_id,
        season_name: season.season_name,
        is_current_season: season.is_current,
      };

      entries.push(entry);

      if (
        entry.team_api_id &&
        entry.tournament_api_id &&
        entry.season_api_id
      ) {
        statsReferences.push({
          teamApiId: entry.team_api_id,
          tournamentApiId: entry.tournament_api_id,
          seasonApiId: entry.season_api_id,
        });
      }
    }
  }

  const statsByReference = await listTeamStatsByApiReferences(statsReferences);

  return entries.map((entry) => ({
    ...entry,
    stats:
      entry.team_api_id && entry.tournament_api_id && entry.season_api_id
        ? statsByReference.get(
            buildStatsKey(
              entry.team_api_id,
              entry.tournament_api_id,
              entry.season_api_id,
            ),
          ) ?? null
        : null,
  }));
}

export async function listTeamComparisonRowsByContext({
  tournamentId,
  seasonId,
  teamIds,
}) {
  const [{ data: teams, error }, { data: participationRows, error: participationError }] =
    await Promise.all([
      getTeamsBaseQuery()
        .in("id", teamIds)
        .order("name", { ascending: true }),
      supabase
        .from("standings_with_team_info")
        .select(PARTICIPATION_SELECT)
        .eq("tournament_db_id", tournamentId)
        .eq("season_db_id", seasonId)
        .in("team_db_id", teamIds)
        .not("team_db_id", "is", null)
        .not("tournament_db_id", "is", null),
    ]);

  if (error) {
    throw error;
  }

  if (participationError) {
    throw participationError;
  }

  const teamsById = new Map((teams ?? []).map((team) => [team.id, team]));
  const participationByTeamId = new Map();

  for (const row of dedupeParticipationRows(participationRows ?? [])) {
    if (!participationByTeamId.has(row.team_db_id)) {
      participationByTeamId.set(row.team_db_id, row);
    }
  }

  const entries = [];
  const statsReferences = [];

  for (const teamId of teamIds) {
    const team = teamsById.get(teamId);
    const participation = participationByTeamId.get(teamId);

    if (!team || !participation) {
      continue;
    }

    const entry = {
      team_id: team.id,
      team_api_id: team.api_id ?? null,
      team_name: team.name,
      team_logo: team.logo_url ?? null,
      tournament_id: participation.tournament_db_id ?? null,
      tournament_api_id: participation.tournament_id ?? null,
      tournament_name: participation.tournament_name?.trim() || null,
      season_id: participation.season_db_id ?? null,
      season_api_id: participation.season_id ?? null,
      season_name: getSeasonLabel(participation),
    };

    entries.push(entry);

    if (
      entry.team_api_id &&
      entry.tournament_api_id &&
      entry.season_api_id
    ) {
      statsReferences.push({
        teamApiId: entry.team_api_id,
        tournamentApiId: entry.tournament_api_id,
        seasonApiId: entry.season_api_id,
      });
    }
  }

  const statsByReference = await listTeamStatsByApiReferences(statsReferences);

  return entries.map((entry) => ({
    ...entry,
    stats:
      entry.team_api_id && entry.tournament_api_id && entry.season_api_id
        ? statsByReference.get(
            buildStatsKey(
              entry.team_api_id,
              entry.tournament_api_id,
              entry.season_api_id,
            ),
          ) ?? null
        : null,
  }));
}
