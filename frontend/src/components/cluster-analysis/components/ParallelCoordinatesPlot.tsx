import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ChangeEvent } from "react";
import type { TeamStatKey } from "../../../teamStatsConfig";
import {
  CHART_Y_TICKS,
  CHART_MARGIN,
  PARALLEL_COORDINATES_CHART_HEIGHT,
} from "../constants";
import { getClusterFilterOptions } from "../utils/clusterAnalysisUtils";
import {
  buildXCoordinates,
  getChartWidth,
  getClusterColor,
  getNormalizedDisplayValue,
} from "../utils/clusterChartUtils";
import {
  buildStatDisplayItems,
  formatDisplayRawStatValue,
  formatNormalizedStatValue,
  getAssignmentSearchText,
} from "../utils/clusterFormatters";
import type {
  ParallelCoordinatesPathRow,
  ParallelCoordinatesPlotProps,
  ParallelCoordinatesPoint,
} from "../types";
import { ClusterFilterControls } from "./ClusterFilterControls";
import { EntrySelectionList } from "./EntrySelectionList";
import { ClusterLegend } from "./ClusterLegend";
import { SelectedEntryDetailsPanel } from "./SelectedEntryDetailsPanel";

export const ParallelCoordinatesPlot = memo(function ParallelCoordinatesPlot({
  result,
  statKeys,
}: ParallelCoordinatesPlotProps) {
  const [selectedParallelClusterIds, setSelectedParallelClusterIds] = useState<
    number[]
  >([]);
  const [selectedParallelEntryIds, setSelectedParallelEntryIds] = useState<
    string[]
  >([]);
  const [entrySearch, setEntrySearch] = useState("");
  const statItems = useMemo(() => buildStatDisplayItems(statKeys), [statKeys]);
  const width = getChartWidth(statItems.length);
  const height = PARALLEL_COORDINATES_CHART_HEIGHT;
  const plotWidth = width - CHART_MARGIN.left - CHART_MARGIN.right;
  const plotHeight = height - CHART_MARGIN.top - CHART_MARGIN.bottom;
  const clusterFilters = useMemo(() => getClusterFilterOptions(result), [result]);
  const availableClusterIds = useMemo(
    () => new Set(clusterFilters.map((option) => option.clusterId)),
    [clusterFilters],
  );
  const selectedParallelClusterIdSet = useMemo(
    () => new Set(selectedParallelClusterIds),
    [selectedParallelClusterIds],
  );
  const selectedParallelEntryIdSet = useMemo(
    () => new Set(selectedParallelEntryIds),
    [selectedParallelEntryIds],
  );
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
  const allPathRows = useMemo<ParallelCoordinatesPathRow[]>(
    () =>
      result.assignments.map((assignment, index) => {
        const color = getClusterColor(assignment.clusterId);
        const points = statItems.map((statItem, statIndex) => {
          const rawValue = assignment.rawStats?.[statItem.statKey];
          const normalizedValue = assignment.normalizedStats?.[statItem.statKey];

          return {
            ...statItem,
            x: xCoordinates[statIndex],
            y: getY(normalizedValue),
            rawDisplayValue: formatDisplayRawStatValue(
              rawValue,
              statItem.statKey,
            ),
            normalizedDisplayValue: formatNormalizedStatValue(normalizedValue),
          };
        });

        return {
          assignment,
          color,
          index,
          path: points
            .map(
              (point, pointIndex) =>
                `${pointIndex === 0 ? "M" : "L"} ${point.x} ${point.y}`,
            )
            .join(" "),
          points,
          pointsByStatKey: Object.fromEntries(
            points.map((point) => [point.statKey, point]),
          ) as Partial<Record<TeamStatKey, ParallelCoordinatesPoint>>,
          searchText: getAssignmentSearchText(assignment),
        };
      }),
    [getY, result.assignments, statItems, xCoordinates],
  );
  const clusterFilteredPathRows = useMemo(
    () =>
      allPathRows.filter(
        (row) =>
          selectedParallelClusterIds.length === 0 ||
          selectedParallelClusterIdSet.has(row.assignment.clusterId),
      ),
    [
      allPathRows,
      selectedParallelClusterIds.length,
      selectedParallelClusterIdSet,
    ],
  );
  const normalizedEntrySearch = useMemo(
    () => entrySearch.trim().toLowerCase(),
    [entrySearch],
  );
  const searchedEntryRows = useMemo(
    () =>
      normalizedEntrySearch.length === 0
        ? clusterFilteredPathRows
        : clusterFilteredPathRows.filter((row) =>
            row.searchText.includes(normalizedEntrySearch),
          ),
    [clusterFilteredPathRows, normalizedEntrySearch],
  );
  const selectedDetailRows = useMemo(
    () =>
      searchedEntryRows.filter((row) =>
        selectedParallelEntryIdSet.has(row.assignment.entryId),
      ),
    [searchedEntryRows, selectedParallelEntryIdSet],
  );
  const orderedPathRows = useMemo(() => {
    if (selectedParallelEntryIds.length === 0) {
      return searchedEntryRows;
    }

    const selectedRows = searchedEntryRows.filter((row) =>
      selectedParallelEntryIdSet.has(row.assignment.entryId),
    );

    return [
      ...searchedEntryRows.filter(
        (row) => !selectedParallelEntryIdSet.has(row.assignment.entryId),
      ),
      ...selectedRows,
    ];
  }, [
    searchedEntryRows,
    selectedParallelEntryIds.length,
    selectedParallelEntryIdSet,
  ]);
  const renderedPathCount = searchedEntryRows.length;
  const assignmentCount = result.assignments.length;
  const hasVisibleRows = searchedEntryRows.length > 0;
  const selectDetailEntry = useCallback((entryId: string) => {
    setSelectedParallelEntryIds((current) =>
      toggleStringSelection(entryId, current),
    );
  }, []);
  const clearDetailEntry = useCallback(() => {
    setSelectedParallelEntryIds([]);
  }, []);
  const handleEntrySearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setEntrySearch(event.target.value);
    },
    [],
  );
  const clearEntrySearch = useCallback(() => {
    setEntrySearch("");
  }, []);
  const toggleClusterFilter = useCallback((clusterId: number) => {
    setSelectedParallelClusterIds((current) =>
      toggleNumberSelection(clusterId, current),
    );
  }, []);
  const clearClusterFilter = useCallback(() => {
    setSelectedParallelClusterIds([]);
  }, []);
  const yTickRows = useMemo(
    () => CHART_Y_TICKS.map((tick) => ({ tick, y: getY(tick) })),
    [getY],
  );

  useEffect(() => {
    setSelectedParallelClusterIds((current) => {
      const validClusterIds = current.filter((clusterId) =>
        availableClusterIds.has(clusterId),
      );

      return validClusterIds.length === current.length
        ? current
        : validClusterIds;
    });
  }, [availableClusterIds]);

  useEffect(() => {
    setSelectedParallelEntryIds([]);
    setSelectedParallelClusterIds([]);
  }, [result.assignments]);

  return (
    <div className="mt-6 rounded-[2rem] border border-slate-800 bg-slate-950/40 p-5">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h5 className="text-sm font-black uppercase tracking-widest text-white">
            Parallel Coordinates
          </h5>
          <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            Normalized 0-1 team-stat profiles grouped by cluster.
          </p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-blue-300">
            Showing {renderedPathCount} of {assignmentCount} entries
          </p>
        </div>
        <ClusterLegend items={clusterFilters} />
      </div>

      <ClusterFilterControls
        options={clusterFilters}
        selectedClusterIds={selectedParallelClusterIds}
        onToggle={toggleClusterFilter}
        onClear={clearClusterFilter}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <EntrySelectionList
          rows={searchedEntryRows}
          searchValue={entrySearch}
          selectedEntryIdSet={selectedParallelEntryIdSet}
          onSearchChange={handleEntrySearchChange}
          onClearSearch={clearEntrySearch}
          onSelect={selectDetailEntry}
        />

        <div>
          <div
            className={
              statItems.length > 7
                ? "overflow-x-auto overflow-y-hidden"
                : "overflow-hidden"
            }
          >
            <svg
              role="img"
              aria-label="Parallel coordinates plot of normalized team cluster statistics"
              viewBox={`0 0 ${width} ${height}`}
              className="h-[420px] max-w-none"
              style={svgStyle}
            >
              {!hasVisibleRows ? (
                <text
                  x={width / 2}
                  y={height / 2}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="12"
                  fontWeight="900"
                >
                  No entries match the current filters.
                </text>
              ) : null}

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

              {orderedPathRows.map((row) => {
                const isSelected = selectedParallelEntryIdSet.has(
                  row.assignment.entryId,
                );
                const hasSelection = selectedParallelEntryIds.length > 0;

                return (
                  <path
                    key={`${row.assignment.entryId}-${row.index}-path`}
                    d={row.path}
                    fill="none"
                    stroke={row.color}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={isSelected ? 4.25 : 1.45}
                    strokeOpacity={
                      isSelected ? 0.98 : hasSelection ? 0.08 : 0.34
                    }
                    pointerEvents="none"
                    aria-label={`${row.assignment.teamName}, Cluster ${row.assignment.clusterId}`}
                  />
                );
              })}

              {selectedDetailRows.flatMap((row) =>
                row.points.map((point) => (
                    <circle
                      key={`${row.assignment.entryId}-${point.statKey}-selected-point`}
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

          <SelectedEntryDetailsPanel
            rows={selectedDetailRows}
            selectedEntryCount={selectedParallelEntryIds.length}
            statItems={statItems}
            onClearSelection={clearDetailEntry}
          />
        </div>
      </div>
    </div>
  );
});

function toggleStringSelection(value: string, selected: string[]): string[] {
  return selected.includes(value)
    ? selected.filter((item) => item !== value)
    : [...selected, value];
}

function toggleNumberSelection(value: number, selected: number[]): number[] {
  return selected.includes(value)
    ? selected.filter((item) => item !== value)
    : [...selected, value];
}
