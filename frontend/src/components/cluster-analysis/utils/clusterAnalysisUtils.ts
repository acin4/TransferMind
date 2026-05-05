import type {
  TeamClusterAssignment,
  TeamClusterRunPayload,
} from "../../../api/api";
import type { TeamStatKey } from "../../../teamStatsConfig";
import type { TeamSeasonStatEntry } from "../../../utils/teamsComparison";
import type {
  ClusterLegendItem,
  ClusterProfile,
  ClusterTeamSeasonEntry,
} from "../types";
import {
  clamp01,
  getNormalizedDisplayValue,
} from "./clusterChartUtils";
import { getSafeStatLabel } from "./clusterFormatters";

export function buildClusterGroups(
  assignments: TeamClusterAssignment[],
  k: number,
) {
  const assignmentsByCluster = new Map<number, TeamClusterAssignment[]>();

  Array.from({ length: k }, (_, index) => index + 1).forEach((clusterId) => {
    assignmentsByCluster.set(clusterId, []);
  });

  assignments.forEach((assignment) => {
    const members = assignmentsByCluster.get(assignment.clusterId) ?? [];
    members.push(assignment);
    assignmentsByCluster.set(assignment.clusterId, members);
  });

  return Array.from(assignmentsByCluster.entries())
    .sort(([leftClusterId], [rightClusterId]) => leftClusterId - rightClusterId)
    .map(([clusterId, members]) => ({
      clusterId,
      members,
    }));
}

export function buildClusterProfiles(
  assignments: TeamClusterAssignment[],
  statKeys: TeamStatKey[],
  k: number,
): ClusterProfile[] {
  return buildClusterGroups(assignments, k)
    .map(({ clusterId, members }) => {
      const averages = Object.fromEntries(
        statKeys.map((statKey) => {
          const total = members.reduce(
            (sum, assignment) =>
              sum + getNormalizedDisplayValue(assignment.normalizedStats?.[statKey]),
            0,
          );
          const average = members.length > 0 ? total / members.length : 0;

          return [statKey, Number(clamp01(average).toFixed(6))];
        }),
      ) as Partial<Record<TeamStatKey, number>>;
      const { strongest, weakest } = getClusterInsightStats(averages, statKeys);

      return {
        clusterId,
        members,
        averages,
        strongest,
        weakest,
      };
    });
}

export function getClusterInsightStats(
  averages: Partial<Record<TeamStatKey, number>>,
  statKeys: TeamStatKey[],
) {
  const rankedStats = statKeys.map((statKey, index) => ({
    statKey,
    label: getSafeStatLabel(statKey),
    value: getNormalizedDisplayValue(averages[statKey]),
    index,
  }));
  const strongest = rankedStats
    .slice()
    .sort((left, right) => right.value - left.value || left.index - right.index)
    .slice(0, Math.min(2, rankedStats.length));
  const strongestKeys = new Set(strongest.map((stat) => stat.statKey));
  const weakest = rankedStats
    .filter((stat) => !strongestKeys.has(stat.statKey))
    .sort((left, right) => left.value - right.value || left.index - right.index)
    .slice(0, Math.min(2, Math.max(0, rankedStats.length - strongest.length)));

  return {
    strongest: strongest.map((stat) => ({
      statKey: stat.statKey,
      label: stat.label,
      value: stat.value,
    })),
    weakest: weakest.map((stat) => ({
      statKey: stat.statKey,
      label: stat.label,
      value: stat.value,
    })),
  };
}

export function getClusterFilterOptions(result: TeamClusterRunPayload): ClusterLegendItem[] {
  return Array.from({ length: result.k }, (_, index) => ({
    clusterId: index + 1,
  })).sort((left, right) => left.clusterId - right.clusterId);
}

export function hasClusterEntryIds(
  entry: TeamSeasonStatEntry,
): entry is ClusterTeamSeasonEntry {
  return (
    Number.isInteger(entry.teamId) &&
    Number.isInteger(entry.tournamentId) &&
    Number.isInteger(entry.seasonId)
  );
}

export function sanitizeSelectedStatKeys(
  statKeys: TeamStatKey[],
  availableStatKeys: Set<TeamStatKey>,
) {
  const cleanedStatKeys: TeamStatKey[] = [];

  statKeys.forEach((statKey) => {
    if (
      availableStatKeys.has(statKey) &&
      !cleanedStatKeys.includes(statKey)
    ) {
      cleanedStatKeys.push(statKey);
    }
  });

  return cleanedStatKeys;
}

export function areStatKeyArraysEqual(left: TeamStatKey[], right: TeamStatKey[]) {
  return (
    left.length === right.length &&
    left.every((statKey, index) => statKey === right[index])
  );
}
