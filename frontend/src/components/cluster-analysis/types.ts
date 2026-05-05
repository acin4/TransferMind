import type { ChangeEvent } from "react";
import type {
  TeamClusterAssignment,
  TeamClusterElbowPayload,
  TeamClusterElbowPoint,
  TeamClusterRunPayload,
} from "../../api/api";
import type { CountryFilterTab } from "../../utils/countryFilters";
import type { SearchFieldValue } from "../../utils/search";
import type { StatCategoryFilterId } from "../../utils/statCategories";
import type { TeamSeasonStatEntry } from "../../utils/teamsComparison";
import type { TeamStatKey } from "../../teamStatsConfig";

export type ClusterAnalysisTabProps = {
  entries: TeamSeasonStatEntry[];
  statKeys: TeamStatKey[];
};

export type SelectFieldProps = {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  options: Array<{ value: string | number; label: string }>;
};

export type MessageBoxProps = {
  tone: "error" | "warning";
  messages: string[];
};

export type ClusterSetupOption<TValue extends string = string> = {
  value: TValue;
  label: string;
  helperText?: string;
  kind?: "team" | "team-season" | "stat";
  logoUrl?: string | null;
  country?: string | null;
  seasonLabel?: string | null;
  statKey?: TValue;
  tagLabel?: string;
  tagHelperText?: string | null;
  searchFields?: SearchFieldValue[];
};

export type ClusterSetupPanelProps = {
  maxK: number;
  maxKOptions: Array<{ value: number; label: string }>;
  matrixRowCount: number;
  matrixColumnCount: number;
  entryOptions: ClusterSetupOption[];
  countryFilteredEntryOptions: ClusterSetupOption[];
  selectedEntryIds: string[];
  selectedCountryFilter: CountryFilterTab;
  statOptions: ClusterSetupOption<TeamStatKey>[];
  categoryFilteredStatOptions: ClusterSetupOption<TeamStatKey>[];
  selectedStatKeys: TeamStatKey[];
  selectedStatCategory: StatCategoryFilterId;
  validationMessage: string | null;
  loadingElbow: boolean;
  requestError: string | null;
  onMaxKChange: (value: string) => void;
  onEntryToggle: (entryId: string) => void;
  onSelectVisibleEntries: (visibleEntryIds: string[]) => void;
  onClearVisibleEntries: (visibleEntryIds: string[]) => void;
  onCountryFilterChange: (value: CountryFilterTab) => void;
  onStatToggle: (statKey: string) => void;
  onSelectVisibleStats: (visibleStatKeys: string[]) => void;
  onClearVisibleStats: (visibleStatKeys: string[]) => void;
  onStatCategoryChange: (value: StatCategoryFilterId) => void;
  onCalculateElbow: () => void;
};

export type ClusterAverageProfilesChartProps = {
  profiles: ClusterProfile[];
  resetAssignments: TeamClusterAssignment[];
  statKeys: TeamStatKey[];
};

export type ClusterLegendProps = {
  items: ClusterLegendItem[];
};

export type ClusterSelectionControlsProps = {
  profiles: ClusterProfile[];
  selectedClusterIds: number[];
  onSelect: (clusterId: number) => void;
  onClear: () => void;
};

export type ClusterAverageDetailsPanelProps = {
  profiles: ClusterProfile[];
  statItems: StatDisplayItem[];
};

export type ParallelCoordinatesPlotProps = {
  result: TeamClusterRunPayload;
  statKeys: TeamStatKey[];
};

export type EntrySelectionListProps = {
  rows: ParallelCoordinatesPathRow[];
  searchValue: string;
  selectedEntryIdSet: ReadonlySet<string>;
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClearSearch: () => void;
  onSelect: (entryId: string) => void;
};

export type SelectedEntryDetailsPanelProps = {
  rows: ParallelCoordinatesPathRow[];
  selectedEntryCount: number;
  statItems: StatDisplayItem[];
  onClearSelection: () => void;
};

export type ClusterMembershipSummaryProps = {
  clusters: ClusterGroup[];
};

export type ClusterFilterControlsProps = {
  options: ClusterLegendItem[];
  selectedClusterIds: number[];
  onToggle: (clusterId: number) => void;
  onClear: () => void;
};

export type ElbowMethodPanelProps = {
  elbowResult: TeamClusterElbowPayload;
  selectedK: number | null;
  kOptions: number[];
  loadingClusters: boolean;
  onSelectedKChange: (k: number | null) => void;
  onRunClusters: () => void;
};

export type ElbowTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: TeamClusterElbowPoint }>;
  label?: string | number;
};

export type ClusterProfile = {
  clusterId: number;
  members: TeamClusterAssignment[];
  averages: Partial<Record<TeamStatKey, number>>;
  strongest: ClusterInsightStat[];
  weakest: ClusterInsightStat[];
};

export type ClusterGroup = {
  clusterId: number;
  members: TeamClusterAssignment[];
};

export type ClusterInsightStat = {
  statKey: TeamStatKey;
  label: string;
  value: number;
};

export type ClusterLegendItem = {
  clusterId: number;
};

export type StatDisplayItem = {
  statKey: TeamStatKey;
  label: string;
  shortLabel: string;
};

export type ParallelCoordinatesPoint = StatDisplayItem & {
  x: number;
  y: number;
  rawDisplayValue: string;
  normalizedDisplayValue: string;
};

export type ParallelCoordinatesPathRow = {
  assignment: TeamClusterAssignment;
  color: string;
  index: number;
  path: string;
  points: ParallelCoordinatesPoint[];
  pointsByStatKey: Partial<Record<TeamStatKey, ParallelCoordinatesPoint>>;
  searchText: string;
};

export type ClusterTeamSeasonEntry = TeamSeasonStatEntry & {
  tournamentId: number;
};
