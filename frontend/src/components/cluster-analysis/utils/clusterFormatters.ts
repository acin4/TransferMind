import type {
  TeamClusterAssignment,
  TeamClusterStat,
} from "../../../api/api";
import {
  getTeamStatMeta,
  type TeamStatKey,
} from "../../../teamStatsConfig";
import { formatRawStatValue } from "../../../utils/teamsComparison";
import type {
  ClusterInsightStat,
  StatDisplayItem,
} from "../types";
import { clamp01 } from "./clusterChartUtils";

// Turns a list of insight stats into text for the details panel.
// If there are no stats to show, return a placeholder instead of leaving the UI blank.
export function formatInsightLabels(stats: ClusterInsightStat[]) {
  if (stats.length === 0) {
    return "—";
  }

  return stats.map((stat) => stat.label).join(", ");
}

// Builds the Tailwind class string for cluster filter/selection buttons.
// Centralizing this keeps active and inactive button styles consistent across
// multiple cluster analysis components.
export function getClusterFilterButtonClass(isActive: boolean) {
  const baseClass =
    "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors";

  // Active buttons use a blue highlight. Inactive buttons stay neutral but still
  // get hover styles so they feel clickable.
  return isActive
    ? `${baseClass} border-blue-500/30 bg-blue-600 text-white shadow-[0_0_18px_rgba(37,99,235,0.25)]`
    : `${baseClass} border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:bg-slate-900 hover:text-slate-100`;
}

// Converts unknown caught errors into a user-facing message.
// JavaScript can throw non-Error values, so this fallback keeps the UI safe.
export function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to complete cluster analysis.";
}

// Looks up the friendly label for a team stat key.
// If metadata is missing, fall back to the raw key so the UI still shows something.
export function getSafeStatLabel(statKey: TeamStatKey) {
  return getTeamStatMeta(statKey)?.label ?? String(statKey);
}

// Returns the season label for a clustered assignment.
// The fallback keeps rows readable even if the backend did not provide a name.
export function getAssignmentSeasonLabel(assignment: TeamClusterAssignment) {
  return assignment.seasonName || `Season ${assignment.seasonId}`;
}

// Returns the tournament/league label for a clustered assignment.
// "Unknown league" is clearer for users than an empty space.
export function getAssignmentTournamentLabel(assignment: TeamClusterAssignment) {
  return assignment.tournamentName ?? "Unknown league";
}

// Builds one searchable lowercase string for an assignment.
// Search inputs can compare against this single string instead of checking each
// field separately in the component.
export function getAssignmentSearchText(assignment: TeamClusterAssignment) {
  return [
    assignment.teamName,
    getAssignmentSeasonLabel(assignment),
    getAssignmentTournamentLabel(assignment),
    `Cluster ${assignment.clusterId}`,
  ]
    .join(" ")
    .toLowerCase();
}

// Formats a raw statistic value for display in tables/tooltips.
// Missing values get a placeholder; real values use the stat-aware formatter from
// the Teams Comparison utilities so units/number formatting stay consistent.
export function formatDisplayRawStatValue(
  value: number | null | undefined,
  statKey: TeamStatKey,
) {
  return value == null ? "—" : formatRawStatValue(value, statKey);
}

// Shortens long labels so axis labels and compact buttons do not overflow.
// The ellipsis tells the user the label was shortened intentionally.
export function truncateLabel(value: string, maxLength: number) {
  return value.length > maxLength
    ? `${value.slice(0, maxLength - 1)}...`
    : value;
}

// Converts selected stat keys into display objects used by charts and tables.
// Each item keeps the original key plus a full label and a shorter axis label.
export function buildStatDisplayItems(statKeys: TeamStatKey[]): StatDisplayItem[] {
  return statKeys.map((statKey) => {
    const label = getSafeStatLabel(statKey);

    return {
      statKey,
      label,
      shortLabel: truncateLabel(label, 14),
    };
  });
}

export function buildStatDisplayItemsFromStats(
  stats: TeamClusterStat[],
): StatDisplayItem[] {
  return stats.map((stat) => {
    const label = stat.label || getSafeStatLabel(stat.key);

    return {
      statKey: stat.key,
      label,
      shortLabel: truncateLabel(label, 14),
    };
  });
}

// Formats normalized stat values for chart/detail tables.
// Values are clamped to 0-1 and shown with three decimals for easy comparison.
export function formatNormalizedStatValue(value: number | null | undefined) {
  return clamp01(Number(value ?? 0)).toFixed(3);
}

// Safely compares optional labels for sorting.
// Null/undefined values become empty strings so localeCompare always receives text.
export function safeCompareLabels(left: string | null | undefined, right: string | null | undefined) {
  return String(left ?? "").localeCompare(String(right ?? ""));
}
