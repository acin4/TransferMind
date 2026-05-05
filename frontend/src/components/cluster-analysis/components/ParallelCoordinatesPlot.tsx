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
  getAssignmentSeasonLabel,
  getAssignmentTournamentLabel,
} from "../utils/clusterFormatters";
import type {
  ClusterFilterValue,
  EntrySelectionListProps,
  ParallelCoordinatesPathRow,
  ParallelCoordinatesPlotProps,
  ParallelCoordinatesPoint,
  SelectedEntryDetailsPanelProps,
} from "../types";
import { ClusterFilterControls } from "./ClusterFilterControls";
import { ClusterLegend } from "./ClusterLegend";

export const ParallelCoordinatesPlot = memo(function ParallelCoordinatesPlot({
  result,
  statKeys,
}: ParallelCoordinatesPlotProps) {
  const [selectedClusterFilter, setSelectedClusterFilter] =
    useState<ClusterFilterValue>("all");
  const [selectedDetailEntryId, setSelectedDetailEntryId] =
    useState<string | null>(null);
  const [entrySearch, setEntrySearch] = useState("");
  const statItems = useMemo(() => buildStatDisplayItems(statKeys), [statKeys]);
  const width = getChartWidth(statItems.length);
  const height = PARALLEL_COORDINATES_CHART_HEIGHT;
  const plotWidth = width - CHART_MARGIN.left - CHART_MARGIN.right;
  const plotHeight = height - CHART_MARGIN.top - CHART_MARGIN.bottom;
  const clusterFilters = useMemo(() => getClusterFilterOptions(result), [result]);
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
        };
      }),
    [getY, result.assignments, statItems, xCoordinates],
  );
  const clusterFilteredPathRows = useMemo(
    () =>
      allPathRows.filter(
        (row) =>
          selectedClusterFilter === "all" ||
          row.assignment.clusterId === selectedClusterFilter,
      ),
    [allPathRows, selectedClusterFilter],
  );
  const normalizedEntrySearch = entrySearch.trim().toLowerCase();
  const searchedEntryRows = useMemo(
    () =>
      normalizedEntrySearch.length === 0
        ? clusterFilteredPathRows
        : clusterFilteredPathRows.filter((row) =>
            getAssignmentSearchText(row.assignment).includes(
              normalizedEntrySearch,
            ),
          ),
    [clusterFilteredPathRows, normalizedEntrySearch],
  );
  const selectedDetailRow = useMemo(
    () =>
      selectedDetailEntryId == null
        ? null
        : searchedEntryRows.find(
            (row) => row.assignment.entryId === selectedDetailEntryId,
          ) ?? null,
    [searchedEntryRows, selectedDetailEntryId],
  );
  const orderedPathRows = useMemo(() => {
    if (!selectedDetailRow) {
      return searchedEntryRows;
    }

    return [
      ...searchedEntryRows.filter(
        (row) => row.assignment.entryId !== selectedDetailRow.assignment.entryId,
      ),
      selectedDetailRow,
    ];
  }, [searchedEntryRows, selectedDetailRow]);
  const selectedDetailPoints = selectedDetailRow?.points ?? [];
  const renderedPathCount = searchedEntryRows.length;
  const assignmentCount = result.assignments.length;
  const hasVisibleRows = searchedEntryRows.length > 0;
  const selectDetailEntry = useCallback((entryId: string) => {
    setSelectedDetailEntryId((current) =>
      current === entryId ? null : entryId,
    );
  }, []);
  const clearDetailEntry = useCallback(() => {
    setSelectedDetailEntryId(null);
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
  const selectClusterFilter = useCallback((value: ClusterFilterValue) => {
    setSelectedClusterFilter((current) => (current === value ? current : value));
  }, []);

  useEffect(() => {
    const availableClusterIds = new Set(clusterFilters.map((option) => option.clusterId));

    if (
      selectedClusterFilter !== "all" &&
      !availableClusterIds.has(selectedClusterFilter)
    ) {
      setSelectedClusterFilter("all");
    }
  }, [clusterFilters, selectedClusterFilter]);

  useEffect(() => {
    if (
      selectedDetailEntryId != null &&
      !searchedEntryRows.some(
        (row) => row.assignment.entryId === selectedDetailEntryId,
      )
    ) {
      setSelectedDetailEntryId(null);
    }
  }, [searchedEntryRows, selectedDetailEntryId]);

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
        value={selectedClusterFilter}
        onChange={selectClusterFilter}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <EntrySelectionList
          rows={searchedEntryRows}
          searchValue={entrySearch}
          selectedEntryId={selectedDetailEntryId}
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

              {orderedPathRows.map((row) => {
                const isSelected =
                  selectedDetailEntryId === row.assignment.entryId;
                const hasSelection = selectedDetailEntryId != null;

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

              {selectedDetailRow
                ? selectedDetailPoints.map((point) => (
                    <circle
                      key={`${selectedDetailRow.assignment.entryId}-${point.statKey}-selected-point`}
                      cx={point.x}
                      cy={point.y}
                      r={4.5}
                      fill={selectedDetailRow.color}
                      stroke="#020617"
                      strokeWidth={1.5}
                    />
                  ))
                : null}
            </svg>
          </div>

          <SelectedEntryDetailsPanel
            row={selectedDetailRow}
            statItems={statItems}
            onClearSelection={clearDetailEntry}
          />
        </div>
      </div>
    </div>
  );
});

const EntrySelectionList = memo(function EntrySelectionList({
  rows,
  searchValue,
  selectedEntryId,
  onSearchChange,
  onClearSearch,
  onSelect,
}: EntrySelectionListProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-widest text-white">
          Entries
        </p>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          {rows.length}
        </span>
      </div>

      <div className="mb-3 flex gap-2">
        <input
          type="search"
          value={searchValue}
          onChange={onSearchChange}
          placeholder="Search team, season, league..."
          className="min-w-0 flex-1 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs font-bold text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
        />
        {searchValue.trim().length > 0 ? (
          <button
            type="button"
            onClick={onClearSearch}
            className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:border-slate-700 hover:bg-slate-900 hover:text-slate-100"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
        {rows.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-950/45 p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
            No entries match the current filters.
          </p>
        ) : (
          rows.map((row) => {
            const isSelected = selectedEntryId === row.assignment.entryId;

            return (
              <button
                key={`${row.assignment.entryId}-${row.index}-entry-button`}
                type="button"
                onClick={() => onSelect(row.assignment.entryId)}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                  isSelected
                    ? "border-blue-500/40 bg-blue-500/10"
                    : "border-slate-800 bg-slate-950/45 hover:border-slate-700 hover:bg-slate-900/80"
                }`}
              >
                <span className="block truncate text-xs font-black uppercase tracking-widest text-white">
                  {row.assignment.teamName}
                </span>
                <span className="mt-1 block truncate text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {getAssignmentSeasonLabel(row.assignment)}
                </span>
                <span className="mt-1 block truncate text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {getAssignmentTournamentLabel(row.assignment)}
                </span>
                <span className="mt-2 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-300">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: getClusterColor(row.assignment.clusterId),
                    }}
                  />
                  Cluster {row.assignment.clusterId}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
});

const SelectedEntryDetailsPanel = memo(function SelectedEntryDetailsPanel({
  row,
  statItems,
  onClearSelection,
}: SelectedEntryDetailsPanelProps) {
  return (
    <div className="mt-4 min-h-[5.5rem] rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      {row ? (
        <>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-white">
                {row.assignment.teamName}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                {getAssignmentSeasonLabel(row.assignment)}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {getAssignmentTournamentLabel(row.assignment)}
              </p>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Cluster {row.assignment.clusterId}
            </p>
          </div>
          <button
            type="button"
            onClick={onClearSelection}
            className="mt-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:border-slate-700 hover:bg-slate-900 hover:text-slate-100"
          >
            Clear selection
          </button>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
            <div className="grid grid-cols-[minmax(0,1fr)_96px_112px] gap-3 bg-slate-950/80 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <span>Statistic</span>
              <span className="text-right">Raw value</span>
              <span className="text-right">Normalized</span>
            </div>
            <div className="max-h-[280px] overflow-y-auto">
              {statItems.map((statItem) => {
                const point = row.pointsByStatKey[statItem.statKey];

                return (
                  <div
                    key={`${row.assignment.entryId}-${statItem.statKey}-detail`}
                    className="grid grid-cols-[minmax(0,1fr)_96px_112px] gap-3 border-t border-slate-800/70 px-3 py-2 text-xs"
                  >
                    <span className="truncate font-bold text-slate-300">
                      {statItem.label}
                    </span>
                    <span className="text-right font-black tabular-nums text-white">
                      {point?.rawDisplayValue ?? "—"}
                    </span>
                    <span className="text-right font-black tabular-nums text-blue-300">
                      {point?.normalizedDisplayValue ?? "0.000"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">
          Select a team-season entry to inspect its raw and normalized values.
        </p>
      )}
    </div>
  );
});
