import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { TeamStatKey } from "../../../teamStatsConfig";
import { ALL_COUNTRIES_TAB } from "../../../utils/countryFilters";
import type { CountryFilterTab } from "../../../utils/countryFilters";
import { ALL_STAT_CATEGORIES } from "../../../utils/statCategories";
import type { StatCategoryFilterId } from "../../../utils/statCategories";

export type UseClusterSelectionStateParams = {
  statKeys: TeamStatKey[];
};

export type UseClusterSelectionStateResult = {
  selectedEntryIds: string[];
  setSelectedEntryIds: Dispatch<SetStateAction<string[]>>;
  selectedStatKeys: TeamStatKey[];
  setSelectedStatKeys: Dispatch<SetStateAction<TeamStatKey[]>>;
  selectedCountryFilter: CountryFilterTab;
  setSelectedCountryFilter: Dispatch<SetStateAction<CountryFilterTab>>;
  selectedStatCategory: StatCategoryFilterId;
  setSelectedStatCategory: Dispatch<SetStateAction<StatCategoryFilterId>>;
  maxK: number;
  setMaxK: Dispatch<SetStateAction<number>>;
  toggleEntry: (entryId: string) => void;
  toggleStat: (statKey: string) => void;
  selectVisibleEntries: (visibleEntryIds: string[]) => void;
  clearVisibleEntries: (visibleEntryIds: string[]) => void;
  selectVisibleStats: (visibleStatKeys: string[]) => void;
  clearVisibleStats: (visibleStatKeys: string[]) => void;
  handleMaxKChange: (value: string) => void;
};

export function useClusterSelectionState(
  { statKeys }: UseClusterSelectionStateParams,
): UseClusterSelectionStateResult {
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [selectedStatKeys, setSelectedStatKeys] = useState<TeamStatKey[]>([]);
  const [selectedCountryFilter, setSelectedCountryFilter] =
    useState<CountryFilterTab>(ALL_COUNTRIES_TAB);
  const [selectedStatCategory, setSelectedStatCategory] =
    useState<StatCategoryFilterId>(ALL_STAT_CATEGORIES);
  const [maxK, setMaxK] = useState(8);

  const availableStatKeySet = useMemo(
    () => new Set(statKeys.filter((statKey) => Boolean(statKey))),
    [statKeys],
  );

  const toggleEntry = (entryId: string) => {
    setSelectedEntryIds((current) =>
      current.includes(entryId)
        ? current.filter((value) => value !== entryId)
        : [...current, entryId],
    );
  };

  const toggleStat = (statKey: string) => {
    const typedStatKey = statKey as TeamStatKey;

    if (!availableStatKeySet.has(typedStatKey)) {
      return;
    }

    setSelectedStatKeys((current) =>
      current.includes(typedStatKey)
        ? current.filter((value) => value !== typedStatKey)
        : [...current, typedStatKey],
    );
  };

  const selectVisibleStats = (visibleStatKeys: string[]) => {
    const visibleTypedStatKeys = visibleStatKeys.filter((statKey) =>
      availableStatKeySet.has(statKey as TeamStatKey),
    ) as TeamStatKey[];

    setSelectedStatKeys((current) => [
      ...current,
      ...visibleTypedStatKeys.filter((statKey) => !current.includes(statKey)),
    ]);
  };

  const clearVisibleStats = (visibleStatKeys: string[]) => {
    const visibleStatKeySet = new Set(visibleStatKeys);
    setSelectedStatKeys((current) =>
      current.filter((statKey) => !visibleStatKeySet.has(statKey)),
    );
  };

  const selectVisibleEntries = (visibleEntryIds: string[]) => {
    setSelectedEntryIds((current) => [
      ...current,
      ...visibleEntryIds.filter((entryId) => !current.includes(entryId)),
    ]);
  };

  const clearVisibleEntries = (visibleEntryIds: string[]) => {
    const visibleEntryIdSet = new Set(visibleEntryIds);
    setSelectedEntryIds((current) =>
      current.filter((entryId) => !visibleEntryIdSet.has(entryId)),
    );
  };

  const handleMaxKChange = (value: string) => {
    setMaxK(Number(value));
  };

  return {
    selectedEntryIds,
    setSelectedEntryIds,
    selectedStatKeys,
    setSelectedStatKeys,
    selectedCountryFilter,
    setSelectedCountryFilter,
    selectedStatCategory,
    setSelectedStatCategory,
    maxK,
    setMaxK,
    toggleEntry,
    toggleStat,
    selectVisibleEntries,
    clearVisibleEntries,
    selectVisibleStats,
    clearVisibleStats,
    handleMaxKChange,
  };
}
