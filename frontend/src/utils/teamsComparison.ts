import {
  TEAM_STATS_CATEGORIES,
  formatTeamStatValue,
  getTeamStatMeta,
  isNegativeTeamStat,
  type TeamStatKey,
  type TeamStats,
} from "../teamStatsConfig";

export type TeamSummary = {
  id: number;
  name: string;
};

export type TeamSeason = {
  season_id: number;
  season_name?: string | null;
  tournament_id?: number | null;
  tournament_name?: string | null;
  is_current?: boolean;
};

export type TeamSeasonStatEntry = {
  id: string;
  teamId: number;
  teamName: string;
  teamLogo?: string | null;
  seasonId: number;
  seasonName: string;
  tournamentId: number | null;
  tournamentName: string | null;
  stageTournamentId?: number | string | null;
  standingGroupId?: number | string | null;
  stageLabel?: string | null;
  stageName?: string | null;
  groupName?: string | null;
  label: string;
  stats: Partial<Record<TeamStatKey, number | null>>;
};

export type StatRange = {
  min: number;
  max: number;
};

export const TEAM_COMPARISON_STAT_KEYS = Array.from(
  new Set(TEAM_STATS_CATEGORIES.flatMap((category) => category.statKeys)),
) as TeamStatKey[];

export function toTeamSeasonEntryId(teamId: number, seasonId: number) {
  return `${teamId}-${seasonId}`;
}

export function toSeasonLabel(season: TeamSeason) {
  const name = season.season_name?.trim();
  return name || `Season ${season.season_id}`;
}

export function sanitizeTeamStats(stats: TeamStats | null | undefined) {
  const sanitized: Partial<Record<TeamStatKey, number | null>> = {};

  TEAM_COMPARISON_STAT_KEYS.forEach((statKey) => {
    const rawValue = stats?.[statKey];

    if (rawValue == null || rawValue === "") {
      sanitized[statKey] = null;
      return;
    }

    const numericValue =
      typeof rawValue === "number"
        ? rawValue
        : typeof rawValue === "string"
          ? Number(rawValue)
          : Number.NaN;

    sanitized[statKey] = Number.isFinite(numericValue) ? numericValue : null;
  });

  return sanitized;
}

export function buildStatRanges(entries: TeamSeasonStatEntry[]) {
  const ranges = new Map<TeamStatKey, StatRange>();

  TEAM_COMPARISON_STAT_KEYS.forEach((statKey) => {
    const values = entries
      .map((entry) => entry.stats[statKey])
      .filter((value): value is number => Number.isFinite(value));

    if (values.length === 0) {
      return;
    }

    ranges.set(statKey, {
      min: Math.min(...values),
      max: Math.max(...values),
    });
  });

  return ranges;
}

export function normalizeStatValue(
  rawValue: number | null | undefined,
  range: StatRange | undefined,
  reverse = false,
) {
  if (rawValue == null) {
    return null;
  }
  if (!Number.isFinite(rawValue) || !range) {
    return 50;
  }

  if (range.max === range.min) {
    return 50;
  }

  const normalized = ((rawValue - range.min) / (range.max - range.min)) * 100;
  const bounded = Math.max(0, Math.min(100, normalized));

  return reverse ? 100 - bounded : bounded;
}

export function getNormalizedEntryStat(
  entry: TeamSeasonStatEntry,
  statKey: TeamStatKey,
  ranges: Map<TeamStatKey, StatRange>,
) {
  return normalizeStatValue(
    entry.stats[statKey],
    ranges.get(statKey),
    isNegativeTeamStat(statKey),
  );
}

export function formatRelativeScoreValue(value: number) {
  return `${value.toFixed(1)} / 100`;
}

export function formatRawStatValue(
  rawValue: number | null | undefined,
  statKey: TeamStatKey,
) {
  return formatTeamStatValue(rawValue, getTeamStatMeta(statKey).format);
}

export function getRelativeScoreBand(value: number) {
  if (value <= 20) {
    return "Poor";
  }

  if (value <= 40) {
    return "Below Average";
  }

  if (value <= 60) {
    return "Average";
  }

  if (value <= 80) {
    return "Good";
  }

  return "Elite";
}

export function getRelativeScoreBandTextColorClass(value: number) {
  const band = getRelativeScoreBand(value);

  if (band === "Poor") {
    return "text-red-400";
  }

  if (band === "Below Average") {
    return "text-orange-400";
  }

  if (band === "Average") {
    return "text-yellow-300";
  }

  if (band === "Good") {
    return "text-lime-300";
  }

  return "text-green-400";
}

export function sortEntriesByLabel(entries: TeamSeasonStatEntry[]) {
  return [...entries].sort((a, b) => a.label.localeCompare(b.label));
}
