import { HttpError } from "../lib/http.js";
import { dedupeStandingsRowsByTeam } from "./standingsGrouping.js";
import {
  getTournamentSeason,
  listCurrentTournamentSeasons,
  listTournamentSeasons,
  listStandingsRows,
} from "../repositories/standingsRepository.js";
import { listTeamMappings } from "../repositories/teamRepository.js";

const STAGE_ORDER = [
  "Regular Season",
  "Stoiximan Super League",
  "League",
  "Main Round",
  "Championship Round",
  "Playoffs",
  "Playout",
  "Relegation Round",
  "Qualifying",
];

const DEFAULT_GROUP_LABELS = [
  "Stoiximan Super League",
  "Regular Season",
  "League",
  "Main Round",
].map(normalizeStageKey);

const DEFERRED_GROUP_LABELS = [
  "Championship Round",
  "Relegation Round",
  "Playoffs",
  "Playout",
].map(normalizeStageKey);

const STAGE_PRIORITY = new Map(
  STAGE_ORDER.map((label, index) => [normalizeStageKey(label), index]),
);

function normalizeStageKey(value) {
  if (value == null) {
    return null;
  }

  const trimmed = String(value).trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.toLocaleLowerCase();
}

function normalizeStageLabel(...values) {
  for (const value of values) {
    if (value == null) {
      continue;
    }

    const trimmed = String(value).trim();

    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

function getStandingsGroupKey(row) {
  const stageTournamentKey =
    row.stage_tournament_id == null
      ? `stage-name:${normalizeStageKey(row.stage_tournament_name) ?? "none"}`
      : `stage:${row.stage_tournament_id}`;
  const standingGroupKey =
    row.standing_group_id == null
      ? `group-name:${normalizeStageKey(row.standing_group_name) ?? "none"}`
      : `group:${row.standing_group_id}`;

  return `${stageTournamentKey}::${standingGroupKey}`;
}

function getStandingsGroupLabel(row) {
  const stageName = row.stage_tournament_name?.trim();
  const groupName = row.standing_group_name?.trim();

  if (stageName && groupName && stageName !== groupName) {
    return `${stageName} - ${groupName}`;
  }

  return row.stage_label || stageName || groupName || "Standings";
}

function buildStandingsGroups(rows) {
  const groupMap = new Map();

  rows.forEach((row) => {
    const groupKey = getStandingsGroupKey(row);
    const existing = groupMap.get(groupKey);

    if (existing) {
      existing.rows.push(row);
      return;
    }

    const stageLabelKey = normalizeStageKey(row.stage_label);
    const priority = stageLabelKey
      ? STAGE_PRIORITY.get(stageLabelKey)
      : undefined;

    groupMap.set(groupKey, {
      key: groupKey,
      label: String(getStandingsGroupLabel(row)).trim(),
      stage: row.stage_label ?? null,
      priority: priority ?? Number.MAX_SAFE_INTEGER,
      rows: [row],
      stageLabelKey,
      standingGroupId: row.standing_group_id ?? null,
      stageTournamentId: row.stage_tournament_id ?? null,
    });
  });

  return Array.from(groupMap.values())
    .filter((group) => group.rows.length > 0)
    .sort((a, b) => {
      const aPriority = a.stageLabelKey
        ? STAGE_PRIORITY.get(a.stageLabelKey)
        : undefined;
      const bPriority = b.stageLabelKey
        ? STAGE_PRIORITY.get(b.stageLabelKey)
        : undefined;

      if (aPriority != null || bPriority != null) {
        if (aPriority == null) return 1;
        if (bPriority == null) return -1;
        if (aPriority !== bPriority) return aPriority - bPriority;
      }

      return a.label.localeCompare(b.label);
    })
    .map((group) => ({
      key: group.key,
      label: group.label,
      stage: group.stage,
      priority: group.priority,
      rows: dedupeStandingsRowsByTeam(group.rows),
      standingGroupId: group.standingGroupId,
      stageTournamentId: group.stageTournamentId,
      stageLabelKey: group.stageLabelKey,
    }));
}

function selectDefaultGroupKey(groups, selection = {}) {
  if (groups.length <= 1) {
    return groups[0]?.key ?? null;
  }

  const hasRequestedGroup =
    selection.standingGroupId != null || selection.stageTournamentId != null;
  const requestedGroup = hasRequestedGroup
    ? groups.find(
        (group) =>
          (selection.standingGroupId == null ||
            group.standingGroupId === selection.standingGroupId) &&
          (selection.stageTournamentId == null ||
            group.stageTournamentId === selection.stageTournamentId),
      )
    : null;
  const preferredMainGroup = groups.find(isPreferredMainGroup);
  const preferredGroup =
    requestedGroup ??
    preferredMainGroup ??
    groups[0];

  return preferredGroup?.key ?? null;
}

function isPreferredMainGroup(group) {
  const searchableLabel = normalizeStageKey(
    [group.label, group.stage].filter(Boolean).join(" "),
  );

  if (!searchableLabel) {
    return false;
  }

  const isDeferredGroup = DEFERRED_GROUP_LABELS.some((label) =>
    searchableLabel.includes(label),
  );

  if (isDeferredGroup) {
    return false;
  }

  return DEFAULT_GROUP_LABELS.some((label) => searchableLabel.includes(label));
}

function toPublicStandingsGroup(group, tournamentId, seasonId) {
  return {
    key: group.key,
    label: group.label,
    stage: group.stage,
    standingGroupId: group.standingGroupId,
    stageTournamentId: group.stageTournamentId,
    tournamentId,
    seasonId,
    priority: group.priority,
    rows: group.rows,
  };
}

export async function getCurrentSeasons() {
  return listCurrentTournamentSeasons();
}

export async function getTournamentSeasons(tournamentId) {
  const seasons = await listTournamentSeasons(tournamentId);

  if (seasons == null) {
    throw new HttpError(404, "Tournament not found.");
  }

  return seasons;
}

export async function getStandingsRows(tournamentId, seasonId) {
  const currentSeason = await getTournamentSeason(tournamentId, seasonId);

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
    team_logo: row.team_logo_url ?? null,
    position: row.position ?? index + 1,
    matches: row.matches ?? 0,
    wins: row.wins ?? 0,
    draws: row.draws ?? 0,
    losses: row.losses ?? 0,
    goals_for: row.goals_for ?? 0,
    goals_against: row.goals_against ?? 0,
    goal_diff: row.goal_diff ?? 0,
    points: row.points ?? 0,
    standing_group_id: row.standing_group_id ?? null,
    standing_group_name: row.standing_group_name?.trim() || null,
    stage_tournament_id: row.stage_tournament_id ?? null,
    stage_tournament_name: row.stage_tournament_name?.trim() || null,
    stage_tournament_slug: row.stage_tournament_slug ?? null,
    stage_label: normalizeStageLabel(
      row.stage_tournament_name,
      row.standing_group_name,
    ),
  }));
}

export async function getStandings(tournamentId, seasonId, selection = {}) {
  const rows = await getStandingsRows(tournamentId, seasonId);
  const groups = buildStandingsGroups(rows);
  const selectedGroupKey = selectDefaultGroupKey(groups, selection);

  return {
    groups: groups.map((group) =>
      toPublicStandingsGroup(group, tournamentId, seasonId),
    ),
    selectedGroupKey,
  };
}
