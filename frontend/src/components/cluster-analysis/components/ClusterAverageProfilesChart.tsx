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
import { buildStatDisplayItems } from "../utils/clusterFormatters";
import type { ClusterAverageProfilesChartProps } from "../types";
import { ClusterAverageDetailsPanel } from "./ClusterAverageDetailsPanel";
import { ClusterLegend } from "./ClusterLegend";
import { ClusterSelectionControls } from "./ClusterSelectionControls";

export const ClusterAverageProfilesChart = memo(function ClusterAverageProfilesChart({
  profiles,
  resetAssignments,
  statKeys,
}: ClusterAverageProfilesChartProps) {
  const [selectedAverageClusterIds, setSelectedAverageClusterIds] = useState<
    number[]
  >([]);
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
  const availableAverageClusterIds = useMemo(
    () => new Set(profiles.map((profile) => profile.clusterId)),
    [profiles],
  );
  const selectedAverageClusterIdSet = useMemo(
    () => new Set(selectedAverageClusterIds),
    [selectedAverageClusterIds],
  );
  const selectedAverageProfiles = useMemo(
    () =>
      sortedProfiles.filter((profile) =>
        selectedAverageClusterIdSet.has(profile.clusterId),
      ),
    [selectedAverageClusterIdSet, sortedProfiles],
  );
  const selectedAverageRows = useMemo(
    () =>
      chartRows.filter((row) =>
        selectedAverageClusterIdSet.has(row.profile.clusterId),
      ),
    [chartRows, selectedAverageClusterIdSet],
  );
  const selectAverageCluster = useCallback((clusterId: number) => {
    setSelectedAverageClusterIds((current) =>
      toggleNumberSelection(clusterId, current),
    );
  }, []);
  const clearAverageCluster = useCallback(() => {
    setSelectedAverageClusterIds([]);
  }, []);
  const yTickRows = useMemo(
    () => CHART_Y_TICKS.map((tick) => ({ tick, y: getY(tick) })),
    [getY],
  );

  useEffect(() => {
    setSelectedAverageClusterIds([]);
  }, [resetAssignments]);

  useEffect(() => {
    setSelectedAverageClusterIds((current) => {
      const validClusterIds = current.filter((clusterId) =>
        availableAverageClusterIds.has(clusterId),
      );

      return validClusterIds.length === current.length
        ? current
        : validClusterIds;
    });
  }, [availableAverageClusterIds]);

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
        selectedClusterIds={selectedAverageClusterIds}
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
            {yTickRows.map(({ tick, y }) => (
              <g key={tick}>
                <line
                  x1={CHART_MARGIN.left}
                  x2={width - CHART_MARGIN.right}
                  y1={y}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray={tick === 0 || tick === 1 ? "0" : "3 3"}
                />
                <text
                  x={CHART_MARGIN.left - 12}
                  y={y + 4}
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
              const isSelected = selectedAverageClusterIdSet.has(
                row.profile.clusterId,
              );
              const hasSelection = selectedAverageClusterIds.length > 0;

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

            {selectedAverageRows.flatMap((row) =>
              row.points.map((point) => (
                  <circle
                    key={`cluster-${row.profile.clusterId}-${point.statKey}-average-point`}
                    cx={point.x}
                    cy={point.y}
                    r={4.5}
                    fill={row.color}
                    stroke="#020617"
                    strokeWidth={1.5}
                  />
                )),
            )}
          </svg>
        </div>

        <ClusterAverageDetailsPanel
          profiles={selectedAverageProfiles}
          statItems={statItems}
        />
      </div>
    </div>
  );
});

function toggleNumberSelection(value: number, selected: number[]): number[] {
  return selected.includes(value)
    ? selected.filter((item) => item !== value)
    : [...selected, value];
}
