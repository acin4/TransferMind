import { useCallback, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { TeamStatKey } from "../../../teamStatsConfig";
import type {
  ClusterAlgorithm,
  TeamAgglomerativeLinkage,
} from "../types";
import { ALL_COUNTRIES_TAB } from "../../../utils/countryFilters";
import type { CountryFilterTab } from "../../../utils/countryFilters";
import { ALL_STAT_CATEGORIES } from "../../../utils/statCategories";
import type { StatCategoryFilterId } from "../../../utils/statCategories";

export type UseClusterSelectionStateParams = {
  statKeys: TeamStatKey[];
};

export type UseClusterSelectionStateResult = {
  selectedAlgorithm: ClusterAlgorithm;
  setSelectedAlgorithm: Dispatch<SetStateAction<ClusterAlgorithm>>;
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
  agglomerativeK: number;
  setAgglomerativeK: Dispatch<SetStateAction<number>>;
  agglomerativeLinkage: TeamAgglomerativeLinkage;
  setAgglomerativeLinkage: Dispatch<SetStateAction<TeamAgglomerativeLinkage>>;
  toggleEntry: (entryId: string) => void;
  toggleStat: (statKey: string) => void;
  selectVisibleEntries: (visibleEntryIds: string[]) => void;
  clearVisibleEntries: (visibleEntryIds: string[]) => void;
  selectVisibleStats: (visibleStatKeys: string[]) => void;
  clearVisibleStats: (visibleStatKeys: string[]) => void;
  handleMaxKChange: (value: string) => void;
  handleAgglomerativeKChange: (value: string) => void;
  handleAgglomerativeLinkageChange: (value: string) => void;
};

export function useClusterSelectionState(
  { statKeys }: UseClusterSelectionStateParams,
): UseClusterSelectionStateResult {
  const [selectedAlgorithm, setSelectedAlgorithm] =
    useState<ClusterAlgorithm>("kmeans");
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [selectedStatKeys, setSelectedStatKeys] = useState<TeamStatKey[]>([]);
  const [selectedCountryFilter, setSelectedCountryFilter] =
    useState<CountryFilterTab>(ALL_COUNTRIES_TAB);
  const [selectedStatCategory, setSelectedStatCategory] =
    useState<StatCategoryFilterId>(ALL_STAT_CATEGORIES);
  const [maxK, setMaxK] = useState(8);
  const [agglomerativeK, setAgglomerativeK] = useState(2);
  const [agglomerativeLinkage, setAgglomerativeLinkage] =
    useState<TeamAgglomerativeLinkage>("ward");

  const availableStatKeySet = useMemo(
    () => new Set(statKeys.filter((statKey) => Boolean(statKey))),
    [statKeys],
  );

  const toggleEntry = useCallback((entryId: string) => {
    setSelectedEntryIds((current) =>
      current.includes(entryId)
        ? current.filter((value) => value !== entryId)
        : [...current, entryId],
    );
  }, []);

  const toggleStat = useCallback((statKey: string) => {
    const typedStatKey = statKey as TeamStatKey;

    if (!availableStatKeySet.has(typedStatKey)) {
      return;
    }

    setSelectedStatKeys((current) =>
      current.includes(typedStatKey)
        ? current.filter((value) => value !== typedStatKey)
        : [...current, typedStatKey],
    );
  }, [availableStatKeySet]);

  const selectVisibleStats = useCallback((visibleStatKeys: string[]) => {
    const visibleTypedStatKeys = visibleStatKeys.filter((statKey) =>
      availableStatKeySet.has(statKey as TeamStatKey),
    ) as TeamStatKey[];

    setSelectedStatKeys((current) => {
      const currentStatKeySet = new Set(current);

      return [
        ...current,
        ...visibleTypedStatKeys.filter(
          (statKey) => !currentStatKeySet.has(statKey),
        ),
      ];
    });
  }, [availableStatKeySet]);

  const clearVisibleStats = useCallback((visibleStatKeys: string[]) => {
    const visibleStatKeySet = new Set(visibleStatKeys);
    setSelectedStatKeys((current) =>
      current.filter((statKey) => !visibleStatKeySet.has(statKey)),
    );
  }, []);

  const selectVisibleEntries = useCallback((visibleEntryIds: string[]) => {
    setSelectedEntryIds((current) => {
      const currentEntryIdSet = new Set(current);

      return [
        ...current,
        ...visibleEntryIds.filter((entryId) => !currentEntryIdSet.has(entryId)),
      ];
    });
  }, []);

  const clearVisibleEntries = useCallback((visibleEntryIds: string[]) => {
    const visibleEntryIdSet = new Set(visibleEntryIds);
    setSelectedEntryIds((current) =>
      current.filter((entryId) => !visibleEntryIdSet.has(entryId)),
    );
  }, []);

  const handleMaxKChange = useCallback((value: string) => {
    setMaxK(Number(value));
  }, []);

  const handleAgglomerativeKChange = useCallback((value: string) => {
    setAgglomerativeK(Number(value));
  }, []);

  const handleAgglomerativeLinkageChange = useCallback((value: string) => {
    setAgglomerativeLinkage(value as TeamAgglomerativeLinkage);
  }, []);

  return {
    selectedAlgorithm,
    setSelectedAlgorithm,
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
    agglomerativeK,
    setAgglomerativeK,
    agglomerativeLinkage,
    setAgglomerativeLinkage,
    toggleEntry,
    toggleStat,
    selectVisibleEntries,
    clearVisibleEntries,
    selectVisibleStats,
    clearVisibleStats,
    handleMaxKChange,
    handleAgglomerativeKChange,
    handleAgglomerativeLinkageChange,
  };
}
