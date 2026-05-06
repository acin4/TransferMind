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
import { toggleSelection } from "../utils/clusterAnalysisUtils";
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

// memo keeps this chart from re-rendering unless its props change. That matters
// because SVG charts can have many calculated points, so avoiding unnecessary
// work helps the cluster analysis page stay responsive.
export const ClusterAverageProfilesChart = memo(function ClusterAverageProfilesChart({
  // profiles contains one average-stat profile per cluster. The parent component
  // calculates this data; this chart only turns it into lines, labels, and details.
  profiles,
  // resetAssignments changes when clustering results are reset or replaced.
  // This component watches it so old chart selections do not stay active.
  resetAssignments,
  // statKeys are the selected statistics that should appear along the X axis.
  statKeys,
}: ClusterAverageProfilesChartProps) {
  // Tracks which cluster lines the user has selected in the chart controls.
  // The same selection also decides which profiles appear in the details panel.
  const [selectedAverageClusterIds, setSelectedAverageClusterIds] = useState<
    number[]
  >([]);
  // Convert raw stat keys into display objects with labels/short labels.
  // useMemo avoids rebuilding this list on every render when statKeys did not change.
  const statItems = useMemo(() => buildStatDisplayItems(statKeys), [statKeys]);
  // The chart grows wider when many statistics are selected, which allows the UI
  // to scroll horizontally instead of squeezing labels until they become unreadable.
  const width = getChartWidth(statItems.length);
  const height = CLUSTER_AVERAGE_CHART_HEIGHT;
  // Plot dimensions subtract the margins reserved for axis labels and padding.
  const plotWidth = width - CHART_MARGIN.left - CHART_MARGIN.right;
  const plotHeight = height - CHART_MARGIN.top - CHART_MARGIN.bottom;
  // X coordinates position every statistic evenly across the usable plot width.
  const xCoordinates = useMemo(
    () => buildXCoordinates(statItems.length, plotWidth),
    [plotWidth, statItems.length],
  );
  // For many stats, the SVG receives a fixed pixel width and the wrapper scrolls.
  // For fewer stats, the SVG can stretch to fill the available container width.
  const svgStyle = useMemo(
    () => ({ width: statItems.length > 7 ? width : "100%" }),
    [statItems.length, width],
  );
  // Converts a normalized stat value into a vertical SVG position.
  // SVG y values grow downward, so 1 is near the top and 0 is near the bottom.
  const getY = useCallback(
    (value: number | null | undefined) =>
      CHART_MARGIN.top + (1 - getNormalizedDisplayValue(value)) * plotHeight,
    [plotHeight],
  );
  // Builds all drawable chart data from the profiles:
  // - a color for each cluster
  // - one point per statistic
  // - an SVG path string that connects those points into a line
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
  // Sort profiles by cluster id so the legend and controls appear in a stable,
  // predictable order instead of whatever order the data happened to arrive in.
  const sortedProfiles = useMemo(
    () =>
      profiles
        .slice()
        .sort((left, right) => left.clusterId - right.clusterId),
    [profiles],
  );
  // A Set makes it quick to check whether a selected cluster still exists after
  // the parent recalculates clustering results.
  const availableAverageClusterIds = useMemo(
    () => new Set(profiles.map((profile) => profile.clusterId)),
    [profiles],
  );
  // A Set is also convenient for repeated "is this cluster selected?" checks
  // while rendering paths and filtering selected rows.
  const selectedAverageClusterIdSet = useMemo(
    () => new Set(selectedAverageClusterIds),
    [selectedAverageClusterIds],
  );
  // Only selected profiles are sent to the details panel, so the side panel
  // mirrors the chart selection exactly.
  const selectedAverageProfiles = useMemo(
    () =>
      sortedProfiles.filter((profile) =>
        selectedAverageClusterIdSet.has(profile.clusterId),
      ),
    [selectedAverageClusterIdSet, sortedProfiles],
  );
  // Only selected rows get visible point markers. This keeps the chart calmer
  // until the user asks to inspect specific clusters.
  const selectedAverageRows = useMemo(
    () =>
      chartRows.filter((row) =>
        selectedAverageClusterIdSet.has(row.profile.clusterId),
      ),
    [chartRows, selectedAverageClusterIdSet],
  );
  // Event handler passed to the selection controls. Clicking a cluster control
  // toggles that cluster id in the selectedAverageClusterIds state array.
  const selectAverageCluster = useCallback((clusterId: number) => {
    setSelectedAverageClusterIds((current) =>
      toggleSelection(clusterId, current),
    );
  }, []);
  // Event handler for the clear button in the selection controls.
  const clearAverageCluster = useCallback(() => {
    setSelectedAverageClusterIds([]);
  }, []);
  // Pre-calculate horizontal grid lines for the chart's 0-1 normalized scale.
  const yTickRows = useMemo(
    () => CHART_Y_TICKS.map((tick) => ({ tick, y: getY(tick) })),
    [getY],
  );

  // When the parent resets/replaces cluster assignments, clear selected clusters.
  // This prevents the UI from showing details for old results.
  useEffect(() => {
    setSelectedAverageClusterIds([]);
  }, [resetAssignments]);

  // If the profiles prop changes and a previously selected cluster no longer
  // exists, remove that id from the current selection.
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
    // Outer card for the full chart area. The border/background visually groups
    // the chart, legend, controls, and details panel as one UI feature.
    <div className="mt-6 rounded-[2rem] border border-slate-800 bg-slate-950/40 p-5">
      {/* Header layout stacks on small screens and becomes a title + legend row
          on wider screens for easier scanning. */}
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h5 className="text-sm font-black uppercase tracking-widest text-white">
            Cluster Average Profiles
          </h5>
          <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            Mean normalized 0-1 values for every selected statistic.
          </p>
        </div>
        {/* The legend shows which color belongs to each cluster line. */}
        <ClusterLegend items={sortedProfiles} />
      </div>

      {/* These controls let the user choose which cluster lines should be
          emphasized and inspected in the details panel. */}
      <ClusterSelectionControls
        profiles={sortedProfiles}
        selectedClusterIds={selectedAverageClusterIds}
        onSelect={selectAverageCluster}
        onClear={clearAverageCluster}
      />

      {/* On extra-large screens the chart and details panel sit side by side.
          On smaller screens they stack, which keeps both areas readable. */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <div
          className={
            // Wide charts scroll horizontally when many stat labels are present.
            statItems.length > 7
              ? "overflow-x-auto overflow-y-hidden"
              : "overflow-hidden"
          }
        >
          {/* SVG is used because the chart is custom: each cluster is a line
              across normalized statistics, with labels and grid lines. */}
          <svg
            role="img"
            aria-label="Cluster average profile chart of normalized team statistics"
            viewBox={`0 0 ${width} ${height}`}
            className="h-[360px] max-w-none"
            style={svgStyle}
          >
            {/* Horizontal grid lines and numeric labels show the normalized 0-1
                scale, helping users compare cluster averages visually. */}
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

            {/* Vertical guide lines and short labels mark each selected statistic
                on the X axis. */}
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

            {/* Draw one connected line per cluster. Selection changes stroke
                width and opacity so selected clusters stand out clearly. */}
            {chartRows.map((row) => {
              const isSelected = selectedAverageClusterIdSet.has(
                row.profile.clusterId,
              );
              // When at least one cluster is selected, unselected lines fade back
              // so the chosen profiles are easier to compare.
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

            {/* Point markers are shown only for selected clusters. They make exact
                stat positions easier to see without cluttering every line. */}
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

        {/* The side panel receives only selected profiles, so it stays synchronized
            with the highlighted chart lines. */}
        <ClusterAverageDetailsPanel
          profiles={selectedAverageProfiles}
          statItems={statItems}
        />
      </div>
    </div>
  );
});
