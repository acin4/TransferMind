import { useMemo } from "react";
import type { TeamClusterEntryRequest } from "../../../api/api";
import type { TeamStatKey } from "../../../teamStatsConfig";
import {
  filterItemsByCountry,
  type CountryFilterTab,
} from "../../../utils/countryFilters";
import {
  filterTeamStatItemsByCategory,
  type StatCategoryFilterId,
} from "../../../utils/statCategories";
import type { TeamSeasonStatEntry } from "../../../utils/teamsComparison";
import type {
  ClusterSetupOption,
  ClusterTeamSeasonEntry,
} from "../types";
import {
  hasClusterEntryIds,
  sanitizeSelectedStatKeys,
} from "../utils/clusterAnalysisUtils";
import {
  getSafeStatLabel,
  safeCompareLabels,
} from "../utils/clusterFormatters";

export type UseClusterSetupDataParams = {
  entries: TeamSeasonStatEntry[];
  statKeys: TeamStatKey[];
  selectedEntryIds: string[];
  selectedStatKeys: TeamStatKey[];
  countryFilter: CountryFilterTab;
  statCategoryFilter: StatCategoryFilterId;
};

export type UseClusterSetupDataResult = {
  clusterEntries: ClusterTeamSeasonEntry[];
  entryOptions: ClusterSetupOption[];
  countryFilteredEntryOptions: ClusterSetupOption[];
  selectedEntries: ClusterTeamSeasonEntry[];
  selectedTeamSeasonEntries: TeamClusterEntryRequest[];
  maxAllowedK: number;
  cleanedSelectedStatKeys: TeamStatKey[];
  statOptions: ClusterSetupOption<TeamStatKey>[];
  categoryFilteredStatOptions: ClusterSetupOption<TeamStatKey>[];
  validationMessage: string | null;
  maxKOptions: Array<{ value: number; label: string }>;
};

export function useClusterSetupData({
  entries,
  statKeys,
  selectedEntryIds,
  selectedStatKeys,
  countryFilter,
  statCategoryFilter,
}: UseClusterSetupDataParams): UseClusterSetupDataResult {
  const clusterEntries = useMemo(
    () => entries.filter(hasClusterEntryIds),
    [entries],
  );

  const entryOptions = useMemo<ClusterSetupOption[]>(
    () =>
      clusterEntries
        .map((entry) => ({
          value: entry.id,
          label: entry.teamName || entry.label,
          helperText: [
            entry.seasonName || `Season ${entry.seasonId}`,
            entry.tournamentName ?? "Unknown league",
          ].join(" • "),
          kind: "team-season" as const,
          logoUrl: entry.teamLogo,
          country: entry.country ?? null,
          seasonLabel: entry.seasonName,
          tagLabel: entry.teamName || entry.label,
          tagHelperText: entry.seasonName,
          searchFields: [
            entry.teamName,
            entry.label,
            entry.seasonName,
            entry.seasonId,
            entry.tournamentName,
            entry.tournamentId,
            entry.stageLabel,
            entry.stageName,
            entry.groupName,
            entry.standingGroupId,
            entry.stageTournamentId,
            entry.country,
          ],
        }))
        .sort((a, b) => safeCompareLabels(a.label, b.label)),
    [clusterEntries],
  );

  const countryFilteredEntryOptions = useMemo(() => {
    return filterItemsByCountry(entryOptions, countryFilter);
  }, [entryOptions, countryFilter]);

  const entriesById = useMemo(
    () => new Map(clusterEntries.map((entry) => [entry.id, entry])),
    [clusterEntries],
  );

  const selectedEntries = useMemo(
    () =>
      selectedEntryIds
        .map((entryId) => entriesById.get(entryId))
        .filter((entry): entry is ClusterTeamSeasonEntry => Boolean(entry)),
    [entriesById, selectedEntryIds],
  );

  const selectedTeamSeasonEntries = useMemo<TeamClusterEntryRequest[]>(
    () =>
      selectedEntries.map((entry) => ({
        teamId: entry.teamId,
        tournamentId: entry.tournamentId,
        seasonId: entry.seasonId,
      })),
    [selectedEntries],
  );

  const maxAllowedK = Math.max(2, Math.min(20, selectedEntries.length));

  const availableStatKeys = useMemo(() => {
    return statKeys
      .filter((statKey) => Boolean(statKey))
      .sort((a, b) =>
        safeCompareLabels(getSafeStatLabel(a), getSafeStatLabel(b)),
      );
  }, [statKeys]);

  const availableStatKeySet = useMemo(
    () => new Set(availableStatKeys),
    [availableStatKeys],
  );

  const cleanedSelectedStatKeys = useMemo(
    () => sanitizeSelectedStatKeys(selectedStatKeys, availableStatKeySet),
    [availableStatKeySet, selectedStatKeys],
  );

  const statOptions = useMemo<ClusterSetupOption<TeamStatKey>[]>(
    () =>
      availableStatKeys
        .map((statKey) => ({
          value: statKey,
          label: getSafeStatLabel(statKey),
          helperText: statKey,
          kind: "stat" as const,
          statKey,
          searchFields: [getSafeStatLabel(statKey), statKey],
        }))
        .filter(
          (option) =>
            option &&
            option.value &&
            typeof option.label === "string" &&
            option.label.trim().length > 0,
        ),
    [availableStatKeys],
  );

  const categoryFilteredStatOptions = useMemo(() => {
    return filterTeamStatItemsByCategory(statOptions, statCategoryFilter);
  }, [statCategoryFilter, statOptions]);

  const validationMessage = useMemo(() => {
    if (selectedEntries.length < 3) {
      return "Select at least three team-season entries.";
    }

    if (cleanedSelectedStatKeys.length < 2) {
      return "Select at least two statistics.";
    }

    return null;
  }, [
    cleanedSelectedStatKeys.length,
    selectedEntries.length,
  ]);

  const maxKOptions = useMemo(
    () =>
      Array.from({ length: maxAllowedK - 1 }, (_, index) => {
        const value = index + 2;

        return {
          value,
          label: String(value),
        };
      }),
    [maxAllowedK],
  );

  return {
    clusterEntries,
    entryOptions,
    countryFilteredEntryOptions,
    selectedEntries,
    selectedTeamSeasonEntries,
    maxAllowedK,
    cleanedSelectedStatKeys,
    statOptions,
    categoryFilteredStatOptions,
    validationMessage,
    maxKOptions,
  };
}
