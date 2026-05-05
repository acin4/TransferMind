import type { TeamClusterAssignment } from "../../../api/api";
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

export function formatInsightLabels(stats: ClusterInsightStat[]) {
  if (stats.length === 0) {
    return "—";
  }

  return stats.map((stat) => stat.label).join(", ");
}

export function getClusterFilterButtonClass(isActive: boolean) {
  const baseClass =
    "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors";

  return isActive
    ? `${baseClass} border-blue-500/30 bg-blue-600 text-white shadow-[0_0_18px_rgba(37,99,235,0.25)]`
    : `${baseClass} border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:bg-slate-900 hover:text-slate-100`;
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to complete cluster analysis.";
}

export function getSafeStatLabel(statKey: TeamStatKey) {
  return getTeamStatMeta(statKey)?.label ?? String(statKey);
}

export function getAssignmentSeasonLabel(assignment: TeamClusterAssignment) {
  return assignment.seasonName || `Season ${assignment.seasonId}`;
}

export function getAssignmentTournamentLabel(assignment: TeamClusterAssignment) {
  return assignment.tournamentName ?? "Unknown league";
}

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

export function formatDisplayRawStatValue(
  value: number | null | undefined,
  statKey: TeamStatKey,
) {
  return value == null ? "—" : formatRawStatValue(value, statKey);
}

export function truncateLabel(value: string, maxLength: number) {
  return value.length > maxLength
    ? `${value.slice(0, maxLength - 1)}...`
    : value;
}

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

export function formatNormalizedStatValue(value: number | null | undefined) {
  return clamp01(Number(value ?? 0)).toFixed(3);
}

export function safeCompareLabels(left: string | null | undefined, right: string | null | undefined) {
  return String(left ?? "").localeCompare(String(right ?? ""));
}
