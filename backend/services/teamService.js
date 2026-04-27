import { HttpError } from "../lib/http.js";
import { getPlayers } from "./playerService.js";
import { getStandingsRows } from "./standingsService.js";
import {
  getLatestTeamStatsByApiId,
  getTeamById,
  getTeamProfileById,
  getTeamStatsByApiReferences,
  listTeamsComparisonDatasetRows,
  listTeams,
  listTeamSeasonsById,
} from "../repositories/teamRepository.js";
import { getTournamentSeason } from "../repositories/standingsRepository.js";

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

function toSeasonLabel(season) {
  const name = season.season_name?.trim();
  return name || `Season ${season.season_id}`;
}

function toComparisonEntry(row) {
  const seasonName = toSeasonLabel(row);

  return {
    id: `${row.team_id}-${row.season_id}`,
    teamId: row.team_id,
    teamName: row.team_name,
    seasonId: row.season_id,
    seasonName,
    tournamentId: row.tournament_id ?? null,
    tournamentName: row.tournament_name?.trim() || null,
    label: `${row.team_name} - ${seasonName}`,
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

function dedupeStandingsRowsByTeam(rows) {
  const rowsByTeamId = new Map();

  rows.forEach((row) => {
    const teamKey = row.team_id == null ? `row:${row.id}` : String(row.team_id);
    const existing = rowsByTeamId.get(teamKey);

    if (
      !existing ||
      (row.position ?? Number.MAX_SAFE_INTEGER) <
        (existing.position ?? Number.MAX_SAFE_INTEGER)
    ) {
      rowsByTeamId.set(teamKey, row);
    }
  });

  return Array.from(rowsByTeamId.values()).sort(
    (a, b) =>
      (a.position ?? Number.MAX_SAFE_INTEGER) -
      (b.position ?? Number.MAX_SAFE_INTEGER),
  );
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

  const [squad, stats, standingsRows] = await Promise.all([
    getPlayers(id),
    selectedSeason ? getOptionalTeamStats(id, selectedSeason.season_id) : null,
    selectedSeason
      ? getOptionalStandings(team?.tournament_id, selectedSeason.season_id)
      : [],
  ]);

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

export async function getTeamsComparisonDataset() {
  const rows = await listTeamsComparisonDatasetRows();
  const entries = rows
    .map(toComparisonEntry)
    .sort((a, b) => a.label.localeCompare(b.label));

  return { entries };
}
