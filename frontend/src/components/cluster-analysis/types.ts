import type { ChangeEvent } from "react";
import type {
  TeamClusterAssignment,
  TeamClusterElbowPoint,
  TeamClusterRunPayload,
} from "../../api/api";
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

export type ClusterAverageProfilesChartProps = {
  profiles: ClusterProfile[];
  statKeys: TeamStatKey[];
};

export type ClusterLegendProps = {
  items: ClusterLegendItem[];
};

export type ClusterSelectionControlsProps = {
  profiles: ClusterProfile[];
  selectedClusterId: number | null;
  onSelect: (clusterId: number) => void;
  onClear: () => void;
};

export type ClusterAverageDetailsPanelProps = {
  profile: ClusterProfile | null;
  statItems: StatDisplayItem[];
};

export type ParallelCoordinatesPlotProps = {
  result: TeamClusterRunPayload;
  statKeys: TeamStatKey[];
};

export type EntrySelectionListProps = {
  rows: ParallelCoordinatesPathRow[];
  searchValue: string;
  selectedEntryId: string | null;
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClearSearch: () => void;
  onSelect: (entryId: string) => void;
};

export type SelectedEntryDetailsPanelProps = {
  row: ParallelCoordinatesPathRow | null;
  statItems: StatDisplayItem[];
  onClearSelection: () => void;
};

export type ClusterMembershipSummaryProps = {
  clusters: Array<{ clusterId: number; members: TeamClusterAssignment[] }>;
};

export type ClusterFilterControlsProps = {
  options: ClusterLegendItem[];
  value: ClusterFilterValue;
  onChange: (value: ClusterFilterValue) => void;
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

export type ClusterInsightStat = {
  statKey: TeamStatKey;
  label: string;
  value: number;
};

export type ClusterLegendItem = {
  clusterId: number;
};

export type ClusterFilterValue = "all" | number;

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
};

export type ClusterTeamSeasonEntry = TeamSeasonStatEntry & {
  tournamentId: number;
};
