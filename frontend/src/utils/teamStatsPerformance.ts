import {
  isNegativeTeamStat,
  type TeamStatKey,
  type TeamStats,
} from "../teamStatsConfig";
import type { TeamSeasonStatEntry } from "./teamsComparison";

export type TeamStatPerformanceColor = "red" | "yellow" | "green" | "neutral";

export type TeamStatMinMax = {
  minValue: number | null;
  maxValue: number | null;
  values: number[];
};

export type TeamStatPerformance = {
  rawValue: number | null;
  normalized: number | null;
  score: number | null;
  minValue: number | null;
  maxValue: number | null;
  bestValue: number | null;
  bestScore: number | null;
  color: TeamStatPerformanceColor;
};

export function getTeamsBySeasonTournament(
  entries: TeamSeasonStatEntry[],
  seasonId: number | string | null | undefined,
  tournamentId: number | string | null | undefined,
) {
  if (seasonId == null || tournamentId == null) {
    return [];
  }

  return entries.filter(
    (entry) =>
      idsMatch(entry.seasonId, seasonId) &&
      idsMatch(entry.tournamentId, tournamentId),
  );
}

export function getStatMinMax(
  entries: TeamSeasonStatEntry[],
  statKey: TeamStatKey,
): TeamStatMinMax {
  const values = entries
    .map((entry) => toNumericStatValue(entry.stats[statKey]))
    .filter((value): value is number => value != null);

  if (values.length === 0) {
    return {
      minValue: null,
      maxValue: null,
      values,
    };
  }

  return {
    minValue: Math.min(...values),
    maxValue: Math.max(...values),
    values,
  };
}

export function normalizeStat(
  value: unknown,
  minValue: number | null,
  maxValue: number | null,
) {
  const numericValue = toNumericStatValue(value);

  if (numericValue == null || minValue == null || maxValue == null) {
    return null;
  }

  if (maxValue === minValue) {
    return 0.5;
  }

  return clamp01((numericValue - minValue) / (maxValue - minValue));
}

export function adjustStatScore(
  normalized: number | null | undefined,
  statKey: TeamStatKey,
) {
  if (normalized == null || !Number.isFinite(normalized)) {
    return null;
  }

  const adjusted = isNegativeTeamStat(statKey) ? 1 - normalized : normalized;
  return clamp01(adjusted);
}

export function computeCategoryScore(
  statScores: Array<number | null | undefined>,
) {
  const validScores = statScores.filter(
    (score): score is number => score != null && Number.isFinite(score),
  );

  if (validScores.length === 0) {
    return null;
  }

  return (
    validScores.reduce((total, score) => total + score, 0) / validScores.length
  );
}

export function getStatColor(
  score: number | null | undefined,
): TeamStatPerformanceColor {
  if (score == null || !Number.isFinite(score)) {
    return "neutral";
  }

  if (score < 0.4) {
    return "red";
  }

  if (score < 0.7) {
    return "yellow";
  }

  return "green";
}

export function getBestStatValue(
  entries: TeamSeasonStatEntry[],
  statKey: TeamStatKey,
) {
  const { values } = getStatMinMax(entries, statKey);

  if (values.length === 0) {
    return null;
  }

  return isNegativeTeamStat(statKey)
    ? Math.min(...values)
    : Math.max(...values);
}

export function computeStatPerformance(
  teamStats: TeamStats,
  entries: TeamSeasonStatEntry[],
  statKey: TeamStatKey,
): TeamStatPerformance {
  const rawValue = toNumericStatValue(teamStats[statKey]);
  const { minValue, maxValue } = getStatMinMax(entries, statKey);
  const normalized = normalizeStat(rawValue, minValue, maxValue);
  const score = adjustStatScore(normalized, statKey);
  const bestValue = getBestStatValue(entries, statKey);
  const bestNormalized = normalizeStat(bestValue, minValue, maxValue);
  const bestScore = adjustStatScore(bestNormalized, statKey);

  return {
    rawValue,
    normalized,
    score,
    minValue,
    maxValue,
    bestValue,
    bestScore,
    color: getStatColor(score),
  };
}

export function toNumericStatValue(value: unknown) {
  if (value == null || value === "") {
    return null;
  }

  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(numericValue) ? numericValue : null;
}

function idsMatch(
  left: number | string | null | undefined,
  right: number | string | null | undefined,
) {
  if (left == null || right == null) {
    return false;
  }

  return String(left) === String(right);
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}
