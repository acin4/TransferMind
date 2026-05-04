import {
  TEAM_STATS_CATEGORIES,
  type TeamStatKey,
  type TeamStatsCategoryId,
} from "../teamStatsConfig";

export const ALL_STAT_CATEGORIES = "all";

export type StatCategoryFilterId =
  | typeof ALL_STAT_CATEGORIES
  | TeamStatsCategoryId;

export const STAT_CATEGORY_FILTERS = [
  {
    id: ALL_STAT_CATEGORIES,
    label: "All",
  },
  ...TEAM_STATS_CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
  })),
] as const satisfies readonly {
  id: StatCategoryFilterId;
  label: string;
}[];

export function filterTeamStatKeysByCategory(
  statKeys: readonly TeamStatKey[],
  categoryId: StatCategoryFilterId,
) {
  if (categoryId === ALL_STAT_CATEGORIES) {
    return [...statKeys];
  }

  const category = TEAM_STATS_CATEGORIES.find(
    (candidate) => candidate.id === categoryId,
  );

  if (!category) {
    return [];
  }

  const categoryStatKeys = new Set<TeamStatKey>(category.statKeys);
  return statKeys.filter((statKey) => categoryStatKeys.has(statKey));
}

export function filterTeamStatItemsByCategory<T extends { value: TeamStatKey }>(
  items: readonly T[],
  categoryId: StatCategoryFilterId,
) {
  if (categoryId === ALL_STAT_CATEGORIES) {
    return [...items];
  }

  const visibleStatKeys = new Set(
    filterTeamStatKeysByCategory(
      items.map((item) => item.value),
      categoryId,
    ),
  );

  return items.filter((item) => visibleStatKeys.has(item.value));
}
