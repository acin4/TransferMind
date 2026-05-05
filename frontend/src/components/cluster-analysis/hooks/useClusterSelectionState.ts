import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { TeamStatKey } from "../../../teamStatsConfig";
import { ALL_COUNTRIES_TAB } from "../../../utils/countryFilters";
import type { CountryFilterTab } from "../../../utils/countryFilters";
import { ALL_STAT_CATEGORIES } from "../../../utils/statCategories";
import type { StatCategoryFilterId } from "../../../utils/statCategories";

export type UseClusterSelectionStateParams = Record<never, never>;

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
};

export function useClusterSelectionState(
  _params: UseClusterSelectionStateParams = {},
): UseClusterSelectionStateResult {
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [selectedStatKeys, setSelectedStatKeys] = useState<TeamStatKey[]>([]);
  const [selectedCountryFilter, setSelectedCountryFilter] =
    useState<CountryFilterTab>(ALL_COUNTRIES_TAB);
  const [selectedStatCategory, setSelectedStatCategory] =
    useState<StatCategoryFilterId>(ALL_STAT_CATEGORIES);
  const [maxK, setMaxK] = useState(8);

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
  };
}
