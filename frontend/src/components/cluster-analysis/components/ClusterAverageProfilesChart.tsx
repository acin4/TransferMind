import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CHART_Y_TICKS,
  CHART_MARGIN,
  CLUSTER_AVERAGE_CHART_HEIGHT,
} from "../constants";
import {
  buildXCoordinates,
  getChartWidth,
  getClusterColor,
  getNormalizedDisplayValue,
} from "../utils/clusterChartUtils";
import {
  buildStatDisplayItems,
  formatInsightLabels,
  formatNormalizedStatValue,
} from "../utils/clusterFormatters";
import type {
  ClusterAverageProfilesChartProps,
  ClusterAverageDetailsPanelProps,
} from "../types";
import { ClusterLegend } from "./ClusterLegend";
import { ClusterSelectionControls } from "./ClusterSelectionControls";

export const ClusterAverageProfilesChart = memo(function ClusterAverageProfilesChart({
  profiles,
  statKeys,
}: ClusterAverageProfilesChartProps) {
  const [selectedAverageClusterId, setSelectedAverageClusterId] =
    useState<number | null>(null);
  const statItems = useMemo(() => buildStatDisplayItems(statKeys), [statKeys]);
  const width = getChartWidth(statItems.length);
  const height = CLUSTER_AVERAGE_CHART_HEIGHT;
  const plotWidth = width - CHART_MARGIN.left - CHART_MARGIN.right;
  const plotHeight = height - CHART_MARGIN.top - CHART_MARGIN.bottom;
  const xCoordinates = useMemo(
    () => buildXCoordinates(statItems.length, plotWidth),
    [plotWidth, statItems.length],
  );
  const svgStyle = useMemo(
    () => ({ width: statItems.length > 7 ? width : "100%" }),
    [statItems.length, width],
  );
  const getY = useCallback(
    (value: number | null | undefined) =>
      CHART_MARGIN.top + (1 - getNormalizedDisplayValue(value)) * plotHeight,
    [plotHeight],
  );
  const chartRows = useMemo(
    () =>
      profiles.map((profile) => {
        const color = getClusterColor(profile.clusterId);
        const points = statItems.map((statItem, index) => {
          const value = profile.averages[statItem.statKey];

          return {
            ...statItem,
            x: xCoordinates[index],
            y: getY(value),
            value,
          };
        });

        return {
          profile,
          color,
          path: points
            .map(
              (point, index) =>
                `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`,
            )
            .join(" "),
          points,
        };
      }),
    [getY, profiles, statItems, xCoordinates],
  );
  const sortedProfiles = useMemo(
    () =>
      profiles
        .slice()
        .sort((left, right) => left.clusterId - right.clusterId),
    [profiles],
  );
  const selectedAverageProfile = useMemo(
    () =>
      selectedAverageClusterId == null
        ? null
        : profiles.find(
            (profile) => profile.clusterId === selectedAverageClusterId,
          ) ?? null,
    [profiles, selectedAverageClusterId],
  );
  const selectedAverageRow = useMemo(
    () =>
      selectedAverageClusterId == null
        ? null
        : chartRows.find(
            (row) => row.profile.clusterId === selectedAverageClusterId,
          ) ?? null,
    [chartRows, selectedAverageClusterId],
  );
  const selectAverageCluster = useCallback((clusterId: number) => {
    setSelectedAverageClusterId((current) =>
      current === clusterId ? current : clusterId,
    );
  }, []);
  const clearAverageCluster = useCallback(() => {
    setSelectedAverageClusterId(null);
  }, []);

  useEffect(() => {
    if (
      selectedAverageClusterId != null &&
      !profiles.some((profile) => profile.clusterId === selectedAverageClusterId)
    ) {
      setSelectedAverageClusterId(null);
    }
  }, [profiles, selectedAverageClusterId]);

  return (
    <div className="mt-6 rounded-[2rem] border border-slate-800 bg-slate-950/40 p-5">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h5 className="text-sm font-black uppercase tracking-widest text-white">
            Cluster Average Profiles
          </h5>
          <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            Mean normalized 0-1 values for every selected statistic.
          </p>
        </div>
        <ClusterLegend items={sortedProfiles} />
      </div>

      <ClusterSelectionControls
        profiles={sortedProfiles}
        selectedClusterId={selectedAverageClusterId}
        onSelect={selectAverageCluster}
        onClear={clearAverageCluster}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <div
          className={
            statItems.length > 7
              ? "overflow-x-auto overflow-y-hidden"
              : "overflow-hidden"
          }
        >
          <svg
            role="img"
            aria-label="Cluster average profile chart of normalized team statistics"
            viewBox={`0 0 ${width} ${height}`}
            className="h-[360px] max-w-none"
            style={svgStyle}
          >
            {CHART_Y_TICKS.map((tick) => (
              <g key={tick}>
                <line
                  x1={CHART_MARGIN.left}
                  x2={width - CHART_MARGIN.right}
                  y1={getY(tick)}
                  y2={getY(tick)}
                  stroke="#1e293b"
                  strokeDasharray={tick === 0 || tick === 1 ? "0" : "3 3"}
                />
                <text
                  x={CHART_MARGIN.left - 12}
                  y={getY(tick) + 4}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="11"
                  fontWeight="800"
                >
                  {tick.toFixed(2)}
                </text>
              </g>
            ))}

            {statItems.map((statItem, index) => (
              <g key={statItem.statKey}>
                <line
                  x1={xCoordinates[index]}
                  x2={xCoordinates[index]}
                  y1={CHART_MARGIN.top}
                  y2={height - CHART_MARGIN.bottom}
                  stroke="#475569"
                  strokeWidth="1.5"
                />
                <text
                  x={xCoordinates[index]}
                  y={height - CHART_MARGIN.bottom + 28}
                  textAnchor="middle"
                  fill="#cbd5e1"
                  fontSize="11"
                  fontWeight="900"
                  aria-label={statItem.label}
                >
                  {statItem.shortLabel}
                </text>
              </g>
            ))}

            {chartRows.map((row) => {
              const isSelected =
                selectedAverageClusterId === row.profile.clusterId;
              const hasSelection = selectedAverageClusterId != null;

              return (
                <path
                  key={`cluster-${row.profile.clusterId}-average-path`}
                  d={row.path}
                  fill="none"
                  stroke={row.color}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={isSelected ? 4.25 : 2.4}
                  strokeOpacity={isSelected ? 0.98 : hasSelection ? 0.18 : 0.9}
                  pointerEvents="none"
                  aria-label={`Cluster ${row.profile.clusterId}, ${row.profile.members.length} entries`}
                />
              );
            })}

            {selectedAverageRow
              ? selectedAverageRow.points.map((point) => (
                  <circle
                    key={`cluster-${selectedAverageRow.profile.clusterId}-${point.statKey}-average-point`}
                    cx={point.x}
                    cy={point.y}
                    r={4.5}
                    fill={selectedAverageRow.color}
                    stroke="#020617"
                    strokeWidth={1.5}
                  />
                ))
              : null}
          </svg>
        </div>

        <ClusterAverageDetailsPanel
          profile={selectedAverageProfile}
          statItems={statItems}
        />
      </div>
    </div>
  );
});

const ClusterAverageDetailsPanel = memo(function ClusterAverageDetailsPanel({
  profile,
  statItems,
}: ClusterAverageDetailsPanelProps) {
  return (
    <div className="min-h-[360px] rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      {profile ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-black uppercase tracking-widest text-white">
              Cluster {profile.clusterId}
            </p>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {profile.members.length} entries
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 text-xs font-bold uppercase tracking-widest">
            <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-3">
              <p className="mb-2 text-[10px] font-black text-slate-500">
                Strongest Statistics
              </p>
              <p className="text-slate-300">
                {formatInsightLabels(profile.strongest)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-3">
              <p className="mb-2 text-[10px] font-black text-slate-500">
                Weakest Statistics
              </p>
              <p className="text-slate-300">
                {formatInsightLabels(profile.weakest)}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800">
            <div className="grid grid-cols-[minmax(0,1fr)_88px] bg-slate-950/80 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <span>Statistic</span>
              <span className="text-right">Average</span>
            </div>
            <div className="max-h-[220px] overflow-y-auto">
              {statItems.map((statItem) => (
                <div
                  key={statItem.statKey}
                  className="grid grid-cols-[minmax(0,1fr)_88px] gap-3 border-t border-slate-800/70 px-3 py-2 text-xs"
                >
                  <span className="truncate font-bold text-slate-300">
                    {statItem.label}
                  </span>
                  <span className="text-right font-black tabular-nums text-blue-300">
                    {formatNormalizedStatValue(
                      profile.averages[statItem.statKey],
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">
          Select a cluster to inspect its average profile.
        </p>
      )}
    </div>
  );
});
