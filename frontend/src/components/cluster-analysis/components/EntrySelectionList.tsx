import {
  memo,
  useCallback,
  useMemo,
} from "react";
import type {
  EntrySelectionListProps,
  ParallelCoordinatesPathRow,
} from "../types";
import { getClusterColor } from "../utils/clusterChartUtils";
import {
  getAssignmentSeasonLabel,
  getAssignmentTournamentLabel,
} from "../utils/clusterFormatters";

export const EntrySelectionList = memo(function EntrySelectionList({
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
          rows.map((row) => (
            <EntrySelectionButton
              key={`${row.assignment.entryId}-${row.index}-entry-button`}
              row={row}
              isSelected={selectedEntryId === row.assignment.entryId}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
});

const EntrySelectionButton = memo(function EntrySelectionButton({
  row,
  isSelected,
  onSelect,
}: {
  row: ParallelCoordinatesPathRow;
  isSelected: boolean;
  onSelect: (entryId: string) => void;
}) {
  const handleSelect = useCallback(() => {
    onSelect(row.assignment.entryId);
  }, [onSelect, row.assignment.entryId]);
  const clusterDotStyle = useMemo(
    () => ({ backgroundColor: getClusterColor(row.assignment.clusterId) }),
    [row.assignment.clusterId],
  );

  return (
    <button
      type="button"
      onClick={handleSelect}
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
          style={clusterDotStyle}
        />
        Cluster {row.assignment.clusterId}
      </span>
    </button>
  );
});
