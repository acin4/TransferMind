import { HttpError } from "../lib/http.js";
import { getPlayers } from "./playerService.js";
import { dedupeStandingsRowsByTeam } from "./standingsGrouping.js";
import { getStandingsRows } from "./standingsService.js";
import {
  getLatestTeamStatsByTeamReferences,
  getTeamById,
  getTeamProfileById,
  getTeamStatsForTeamSeason,
  listTeamComparisonRowsByContext,
  listTeamsComparisonDatasetRows,
  listTeams,
  listTeamSeasonsById,
} from "../repositories/teamRepository.js";
import {
  getTeamStatMetadata,
  listTeamStatMetadata,
} from "../lib/teamStatsMetadata.js";

const TEAM_STATS_PRIVATE_FIELDS = new Set([
  "id",
  "team_id",
  "tournament_id",
  "season_id",
  "has_stats",
]);

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

function sanitizeComparisonStats(stats) {
  const sanitizedStats = {};

  if (!stats) {
    return sanitizedStats;
  }

  for (const [key, value] of Object.entries(stats)) {
    if (TEAM_STATS_PRIVATE_FIELDS.has(key)) {
      continue;
    }

    if (value == null || value === "") {
      sanitizedStats[key] = null;
      continue;
    }

    const numericValue =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? Number(value)
          : Number.NaN;

    sanitizedStats[key] = Number.isFinite(numericValue) ? numericValue : null;
  }

  return sanitizedStats;
}

function toNumericStatValue(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parsePositiveIntegerField(value, fieldName) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(400, `${fieldName} must be a positive integer.`);
  }

  return parsed;
}

function parsePositiveIntegerArray(value, fieldName) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(400, `${fieldName} must be a non-empty array.`);
  }

  const parsedValues = value.map((item, index) =>
    parsePositiveIntegerField(item, `${fieldName}[${index}]`),
  );

  return [...new Set(parsedValues)];
}

function parseStatKeys(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(400, "statKeys must be a non-empty array.");
  }

  const statKeys = [
    ...new Set(
      value.map((item) => String(item ?? "").trim()).filter(Boolean),
    ),
  ];

  if (statKeys.length === 0) {
    throw new HttpError(400, "statKeys must include at least one valid key.");
  }

  const invalidStatKey = statKeys.find(
    (statKey) => !getTeamStatMetadata(statKey),
  );

  if (invalidStatKey) {
    throw new HttpError(400, `Unknown statistic key: ${invalidStatKey}.`);
  }

  return statKeys;
}

function normalizeStatValue(rawValue, validValues) {
  if (rawValue == null) {
    return null;
  }

  if (validValues.length === 0) {
    return null;
  }

  if (validValues.length === 1) {
    return 0.5;
  }

  const minValue = Math.min(...validValues);
  const maxValue = Math.max(...validValues);

  if (minValue === maxValue) {
    return 0.5;
  }

  const normalized = (rawValue - minValue) / (maxValue - minValue);
  return Number(Math.max(0, Math.min(1, normalized)).toFixed(6));
}

function adjustStatScore(normalizedValue, direction) {
  if (normalizedValue == null) {
    return null;
  }

  const adjusted =
    direction === "negative" ? 1 - normalizedValue : normalizedValue;

  return Number(Math.max(0, Math.min(1, adjusted)).toFixed(6));
}

function toSeasonLabel(season) {
  const name = season.season_name?.trim();
  return name || `Season ${season.season_id}`;
}

function toComparisonEntry(row) {
  const seasonName = toSeasonLabel(row);
  const tournamentName = row.tournament_name?.trim() || null;

  return {
    id: `${row.team_id}-${row.tournament_id}-${row.season_id}`,
    teamId: row.team_id,
    teamName: row.team_name,
    teamLogo: row.team_logo ?? null,
    seasonId: row.season_id,
    seasonName,
    tournamentId: row.tournament_id ?? null,
    tournamentName,
    label: [row.team_name, tournamentName, seasonName]
      .filter(Boolean)
      .join(" - "),
    stats: sanitizeComparisonStats(row.stats),
  };
}

function normalizeStageKey(value) {
  if (value == null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed ? trimmed.toLocaleLowerCase() : null;
}

function getStandingGroupKey(row) {
  return [
    row.stage_tournament_id ?? "stage:none",
    row.standing_group_id ?? "group:none",
    normalizeStageKey(row.stage_label) ?? "label:none",
  ].join("::");
}

function getTeamProfileStagePriority(row) {
  const label = normalizeStageKey(row.stage_label);

  if (!label) {
    return 50;
  }

  if (label.includes("championship")) return 0;
  if (label.includes("playoff") || label.includes("play-off")) return 1;
  if (label.includes("playout") || label.includes("play-out")) return 2;
  if (label.includes("relegation")) return 3;
  if (label.includes("regular")) return 10;

  return 5;
}

function buildStandingsGroups(rows) {
  const groups = new Map();

  rows.forEach((row) => {
    const groupKey = getStandingGroupKey(row);
    const existing = groups.get(groupKey);

    if (existing) {
      existing.rows.push(row);
      return;
    }

    groups.set(groupKey, {
      key: groupKey,
      standingGroupId: row.standing_group_id ?? null,
      stageTournamentId: row.stage_tournament_id ?? null,
      stage_name: row.stage_tournament_name?.trim() || null,
      group_name: row.standing_group_name?.trim() || null,
      stage_label: row.stage_label ?? null,
      rows: [row],
    });
  });

  return Array.from(groups.values());
}

function selectTeamProfileStandingsRows(rows, teamId) {
  const groups = new Map();

  rows.forEach((row) => {
    const groupKey = getStandingGroupKey(row);
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), row]);
  });

  const candidateGroups = Array.from(groups.values()).filter((groupRows) =>
    groupRows.some((row) => String(row.team_id) === String(teamId)),
  );

  if (candidateGroups.length === 0) {
    return {
      rows: [],
      teamRow: null,
      standingGroupId: null,
      stageTournamentId: null,
    };
  }

  const selectedGroup =
    candidateGroups.sort((a, b) => {
      const priorityDelta =
        getTeamProfileStagePriority(a[0]) - getTeamProfileStagePriority(b[0]);

      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return (
        Math.max(...b.map((row) => Number(row.id ?? 0))) -
        Math.max(...a.map((row) => Number(row.id ?? 0)))
      );
    })[0] ?? [];

  const dedupedRows = dedupeStandingsRowsByTeam(selectedGroup);

  return {
    rows: dedupedRows,
    teamRow:
      dedupedRows.find((row) => String(row.team_id) === String(teamId)) ?? null,
    standingGroupId: selectedGroup[0]?.standing_group_id ?? null,
    stageTournamentId: selectedGroup[0]?.stage_tournament_id ?? null,
    stage_name: selectedGroup[0]?.stage_tournament_name?.trim() || null,
    group_name: selectedGroup[0]?.standing_group_name?.trim() || null,
    stage_label: selectedGroup[0]?.stage_label ?? null,
  };
}

function buildMiniTable(selectedStandings, teamId) {
  const standingsRows = selectedStandings.rows;
  const teamIndex = standingsRows.findIndex(
    (row) => String(row.team_id) === String(teamId),
  );

  if (teamIndex === -1) {
    return {
      selectedStandingsGroup: null,
      miniTable: {
        rows: [],
        teamRow: null,
      },
    };
  }

  let startIdx = Math.max(0, teamIndex - 1);
  let endIdx = Math.min(standingsRows.length, startIdx + 4);

  if (endIdx - startIdx < 4) {
    startIdx = Math.max(0, endIdx - 4);
  }

  return {
    selectedStandingsGroup: {
      standingGroupId: selectedStandings.standingGroupId,
      stageTournamentId: selectedStandings.stageTournamentId,
      stage_name: selectedStandings.stage_name,
      group_name: selectedStandings.group_name,
      stage_label: selectedStandings.stage_label,
      rows: selectedStandings.rows,
    },
    miniTable: {
      rows: standingsRows.slice(startIdx, endIdx),
      teamRow: selectedStandings.teamRow,
    },
  };
}

function isNotFoundError(error) {
  return error?.statusCode === 404;
}

async function getOptionalTeamStats(id, seasonId) {
  try {
    return await getTeamStats(id, seasonId);
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }

    throw error;
  }
}

async function getOptionalStandings(tournamentId, seasonId) {
  if (!tournamentId || !seasonId) {
    return [];
  }

  try {
    return await getStandingsRows(tournamentId, seasonId);
  } catch (error) {
    if (isNotFoundError(error)) {
      return [];
    }

    throw error;
  }
}

export async function getTeams() {
  const teams = await listTeams();
  return teams.map(sanitizeTeam);
}

export async function getTeam(id) {
  const team = await getTeamProfileById(id);
  return sanitizeTeam(team, { includeCompetition: true });
}

export async function getTeamProfile(id, seasonId) {
  const baseTeam = await getTeamById(id);

  if (!baseTeam) {
    throw new HttpError(404, "Team not found.");
  }

  const profileTeam = await getTeamProfileById(id);
  const team = sanitizeTeam(profileTeam, { includeCompetition: true });
  const seasons = await listTeamSeasonsById(id, baseTeam.tournament_id ?? null);
  const selectedSeason =
    seasonId === undefined
      ? seasons.find((season) => season.is_current) ?? seasons[0] ?? null
      : seasons.find((season) => season.season_id === seasonId) ?? null;

  if (seasonId !== undefined && !selectedSeason) {
    throw new HttpError(404, "Team season not found.");
  }

  console.debug("[TeamProfile] selected season", {
    routeTeamId: id,
    teamApiId: baseTeam.api_id ?? null,
    selectedSeasonId: selectedSeason?.season_id ?? null,
    selectedSeasonApiId: selectedSeason?.season_api_id ?? null,
    seasonCount: seasons.length,
  });

  const [squad, stats, standingsRows] = await Promise.all([
    selectedSeason ? getPlayers(id, selectedSeason.season_id) : getPlayers(id),
    selectedSeason ? getOptionalTeamStats(id, selectedSeason.season_id) : null,
    selectedSeason
      ? getOptionalStandings(team?.tournament_id, selectedSeason.season_id)
      : [],
  ]);

  console.debug("[TeamProfile] loaded season-specific profile data", {
    routeTeamId: id,
    selectedSeasonId: selectedSeason?.season_id ?? null,
    selectedSeasonApiId: selectedSeason?.season_api_id ?? null,
    statisticsResultCount: stats ? 1 : 0,
    squadResultCount: squad.length,
  });

  const standingsGroups = buildStandingsGroups(standingsRows);
  const selectedStandings = selectTeamProfileStandingsRows(standingsRows, id);
  const { selectedStandingsGroup, miniTable } = buildMiniTable(
    selectedStandings,
    id,
  );

  return {
    team,
    squad,
    seasons,
    selectedSeason,
    stats,
    standings: {
      groups: standingsGroups,
      rows: standingsRows,
    },
    selectedStandingsGroup,
    miniTable,
  };
}

export async function getTeamStats(id, seasonId) {
  const team = await getTeamById(id);

  if (!team) {
    throw new HttpError(404, "Team not found.");
  }

  if (seasonId === undefined) {
    const stats = await getLatestTeamStatsByTeamReferences(team);
    return sanitizeTeamStats(stats, team.id);
  }

  const stats = await getTeamStatsForTeamSeason(team, seasonId);
  return sanitizeTeamStats(stats, team.id);
}

export async function getTeamSeasons(id) {
  const team = await getTeamById(id);

  if (!team) {
    throw new HttpError(404, "Team not found.");
  }

  return listTeamSeasonsById(id, team.tournament_id ?? null);
}

export async function getTeamsComparisonDataset() {
  const rows = await listTeamsComparisonDatasetRows();
  const entries = rows
    .map(toComparisonEntry)
    .sort((a, b) => a.label.localeCompare(b.label));

  return {
    entries,
    stats: listTeamStatMetadata(),
  };
}

export async function getTeamComparisonMatrix(payload) {
  const tournamentId = parsePositiveIntegerField(
    payload?.tournamentId,
    "tournamentId",
  );
  const seasonId = parsePositiveIntegerField(payload?.seasonId, "seasonId");
  const teamIds = parsePositiveIntegerArray(payload?.teamIds, "teamIds");
  const statKeys = parseStatKeys(payload?.statKeys);
  const rows = await listTeamComparisonRowsByContext({
    tournamentId,
    seasonId,
    teamIds,
  });

  if (rows.length !== teamIds.length) {
    throw new HttpError(
      400,
      "All selected teams must belong to the selected tournament and season.",
    );
  }

  const rowsByTeamId = new Map(rows.map((row) => [row.team_id, row]));
  const orderedRows = teamIds.map((teamId) => rowsByTeamId.get(teamId));
  const stats = statKeys.map((statKey) => {
    const metadata = getTeamStatMetadata(statKey);
    const values = orderedRows
      .map((row) => toNumericStatValue(row?.stats?.[statKey]))
      .filter((value) => value != null);

    return {
      ...metadata,
      minRawValue: values.length > 0 ? Math.min(...values) : null,
      maxRawValue: values.length > 0 ? Math.max(...values) : null,
    };
  });
  const statsByKey = new Map(stats.map((stat) => [stat.key, stat]));

  return {
    context: {
      tournamentId,
      seasonId,
    },
    stats,
    entries: orderedRows.map((row) => ({
      teamId: row.team_id,
      teamName: row.team_name,
      teamLogo: row.team_logo ?? null,
      values: Object.fromEntries(
        statKeys.map((statKey) => {
          const stat = statsByKey.get(statKey);
          const rawValue = toNumericStatValue(row.stats?.[statKey]);
          const validValues = orderedRows
            .map((candidate) => toNumericStatValue(candidate?.stats?.[statKey]))
            .filter((value) => value != null);
          const normalizedValue = normalizeStatValue(rawValue, validValues);

          return [
            statKey,
            {
              rawValue,
              normalizedValue,
              adjustedScore: adjustStatScore(
                normalizedValue,
                stat?.direction ?? "positive",
              ),
            },
          ];
        }),
      ),
    })),
  };
}
