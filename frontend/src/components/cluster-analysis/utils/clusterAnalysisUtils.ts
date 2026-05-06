import type {
  TeamClusterAssignment,
  TeamClusterRunPayload,
} from "../../../api/api";
import type { TeamStatKey } from "../../../teamStatsConfig";
import type { TeamSeasonStatEntry } from "../../../utils/teamsComparison";
import type {
  ClusterGroup,
  ClusterLegendItem,
  ClusterProfile,
  ClusterTeamSeasonEntry,
} from "../types";
import {
  clamp01,
  getNormalizedDisplayValue,
} from "./clusterChartUtils";
import { getSafeStatLabel } from "./clusterFormatters";

// Groups individual team-season assignments by cluster id.
// The UI uses this shape when it needs to render "Cluster 1", "Cluster 2", etc.
// with each cluster's member entries underneath.
export function buildClusterGroups(
  // assignments is the flat list returned after running k-means.
  assignments: TeamClusterAssignment[],
  // k is the requested number of clusters. It is used to create empty groups too,
  // so the UI can still show every cluster even if one has no members.
  k: number,
): ClusterGroup[] {
  // Map is useful here because cluster ids are numeric keys and each key points
  // to an array of assignments in that cluster.
  const assignmentsByCluster = new Map<number, TeamClusterAssignment[]>();

  // Create one empty array per expected cluster before adding assignments.
  Array.from({ length: k }, (_, index) => index + 1).forEach((clusterId) => {
    assignmentsByCluster.set(clusterId, []);
  });

  // Put each assignment into the array for its cluster id.
  assignments.forEach((assignment) => {
    const members = assignmentsByCluster.get(assignment.clusterId) ?? [];
    members.push(assignment);
    assignmentsByCluster.set(assignment.clusterId, members);
  });

  // Convert the Map back into an ordered array because React components usually
  // render arrays with map().
  return Array.from(assignmentsByCluster.entries())
    .sort(([leftClusterId], [rightClusterId]) => leftClusterId - rightClusterId)
    .map(([clusterId, members]) => ({
      clusterId,
      members,
    }));
}

// Builds higher-level cluster profiles used by the average-profile chart and
// details panel. A profile adds average stat values plus strongest/weakest stats
// on top of the raw cluster members.
export function buildClusterProfiles(
  assignments: TeamClusterAssignment[],
  statKeys: TeamStatKey[],
  k: number,
): ClusterProfile[] {
  return buildClusterGroups(assignments, k)
    .map(({ clusterId, members }) => {
      // Calculate one average normalized value per selected statistic.
      // Object.fromEntries turns pairs like ["goals", 0.7] into an object.
      const averages = Object.fromEntries(
        statKeys.map((statKey) => {
          // Sum the normalized value for this statistic across all cluster members.
          // getNormalizedDisplayValue safely handles missing/null values.
          const total = members.reduce(
            (sum, assignment) =>
              sum + getNormalizedDisplayValue(assignment.normalizedStats?.[statKey]),
            0,
          );
          // Empty clusters get an average of 0 so charts still have a safe value.
          const average = members.length > 0 ? total / members.length : 0;

          // Clamp and round the average so the UI receives stable 0-1 values.
          return [statKey, Number(clamp01(average).toFixed(6))];
        }),
      ) as Partial<Record<TeamStatKey, number>>;
      // Identify the highest and lowest average stats for quick cluster insight
      // labels in the details panel.
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

// Finds the strongest and weakest stats in a cluster profile.
// "Strongest" means highest normalized average, and "weakest" means lowest
// normalized average among the selected stats.
export function getClusterInsightStats(
  averages: Partial<Record<TeamStatKey, number>>,
  statKeys: TeamStatKey[],
) {
  // Keep the original index so ties can fall back to the user's selected stat
  // order, making the output stable and predictable.
  const rankedStats = statKeys.map((statKey, index) => ({
    statKey,
    label: getSafeStatLabel(statKey),
    value: getNormalizedDisplayValue(averages[statKey]),
    index,
  }));
  // Pick up to two highest-value stats for the "strongest" summary.
  const strongest = rankedStats
    .slice()
    .sort((left, right) => right.value - left.value || left.index - right.index)
    .slice(0, Math.min(2, rankedStats.length));
  // Remember strongest keys so the same stat is not also shown as weakest.
  const strongestKeys = new Set(strongest.map((stat) => stat.statKey));
  // Pick up to two lowest-value stats from the remaining stats.
  const weakest = rankedStats
    .filter((stat) => !strongestKeys.has(stat.statKey))
    .sort((left, right) => left.value - right.value || left.index - right.index)
    .slice(0, Math.min(2, Math.max(0, rankedStats.length - strongest.length)));

  // Return only the fields the UI needs for labels and values.
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

// Creates a simple cluster list for filter buttons or legends after k-means runs.
// It uses result.k instead of assignments so every expected cluster gets an option.
export function getClusterFilterOptions(result: TeamClusterRunPayload): ClusterLegendItem[] {
  return Array.from({ length: result.k }, (_, index) => ({
    clusterId: index + 1,
  })).sort((left, right) => left.clusterId - right.clusterId);
}

// Type guard for entries that have the numeric ids needed by the clustering API.
// After this function returns true, TypeScript knows the entry is safe to treat
// as a ClusterTeamSeasonEntry.
export function hasClusterEntryIds(
  entry: TeamSeasonStatEntry,
): entry is ClusterTeamSeasonEntry {
  return (
    Number.isInteger(entry.teamId) &&
    Number.isInteger(entry.tournamentId) &&
    Number.isInteger(entry.seasonId)
  );
}

// Removes invalid or duplicate stat keys from a selected-stat array.
// This protects the UI when available stats change after filtering or new data loads.
export function sanitizeSelectedStatKeys(
  statKeys: TeamStatKey[],
  availableStatKeys: Set<TeamStatKey>,
) {
  // Build a new array instead of editing the original selection in place.
  const cleanedStatKeys: TeamStatKey[] = [];

  statKeys.forEach((statKey) => {
    // Keep only stats that still exist and have not already been added.
    if (
      availableStatKeys.has(statKey) &&
      !cleanedStatKeys.includes(statKey)
    ) {
      cleanedStatKeys.push(statKey);
    }
  });

  return cleanedStatKeys;
}

// Compares two stat-key arrays by length and order.
// This is useful because two arrays can contain the same values but still be
// different selections if the order changed.
export function areStatKeyArraysEqual(left: TeamStatKey[], right: TeamStatKey[]) {
  return (
    left.length === right.length &&
    left.every((statKey, index) => statKey === right[index])
  );
}

// Generic selection helper used by buttons and checkboxes.
// If the value is already selected it removes it; otherwise it appends it.
export function toggleSelection<T>(value: T, selected: T[]): T[] {
  return selected.includes(value)
    ? selected.filter((item) => item !== value)
    : [...selected, value];
}
