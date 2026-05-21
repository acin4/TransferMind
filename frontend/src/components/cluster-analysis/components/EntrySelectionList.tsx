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
import { SearchInput, standingsTheme } from "../../ui/design";

// memo keeps the list from re-rendering unless its props change.
// The parent owns the search text and selected entries; this component displays
// the current filtered rows and reports user actions back upward.
export const EntrySelectionList = memo(function EntrySelectionList({
  // rows is the already-filtered list of team-season entries to show.
  rows,
  // searchValue is controlled by the parent, so the input always reflects the
  // parent state.
  searchValue,
  // selectedEntryIdSet lets this component quickly check whether each entry is
  // currently selected.
  selectedEntryIdSet,
  // Called whenever the user types in the search input.
  onSearchChange,
  // Called when the user clicks the Clear button next to the search input.
  onClearSearch,
  // Called when the user clicks an entry row.
  onSelect,
}: EntrySelectionListProps) {
  return (
    // Outer card groups the entry search box and scrollable entry list.
    <div className={standingsTheme.nestedPanel}>
      {/* Header shows the section label and the number of visible rows after
          filtering/searching. */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-widest text-white">
          Entries
        </p>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          {rows.length}
        </span>
      </div>

      {/* Search row:
          the input fills available width, while the Clear button appears only
          when there is text to clear. */}
      <div className="mb-3 flex gap-2">
        <SearchInput
          value={searchValue}
          onChange={onSearchChange}
          placeholder="Search team, season, league..."
          className="!mb-0 !max-w-none flex-1"
        />
        {/* Only show Clear when the search has non-space characters, keeping the
            UI quieter when there is nothing to reset. */}
        {searchValue.trim().length > 0 ? (
          <button
            type="button"
            // Clears the search text in the parent component.
            onClick={onClearSearch}
            className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:border-slate-700 hover:bg-slate-900 hover:text-slate-100"
          >
            Clear
          </button>
        ) : null}
      </div>

      {/* The list scrolls inside a fixed-height area so many entries do not push
          the rest of the analysis UI far down the page. */}
      <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
        {rows.length === 0 ? (
          // Empty state shown when search/filtering removes every row.
          <p className="rounded-xl border border-slate-800 bg-slate-950/45 p-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
            No entries match the current filters.
          </p>
        ) : (
          rows.map((row) => (
            // A separate memoized button keeps each row easier to read and helps
            // avoid unnecessary work when other rows change.
            <EntrySelectionButton
              key={`${row.assignment.entryId}-${row.index}-entry-button`}
              row={row}
              isSelected={selectedEntryIdSet.has(row.assignment.entryId)}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
});

// Renders one selectable team-season entry.
// Keeping this as a child component makes the list JSX simpler and lets React
// memoize each button independently.
const EntrySelectionButton = memo(function EntrySelectionButton({
  // row contains the assignment data plus chart-related metadata from the parent.
  row,
  // isSelected controls the active visual style for this entry.
  isSelected,
  // onSelect is the parent callback for selecting this entry.
  onSelect,
}: {
  row: ParallelCoordinatesPathRow;
  isSelected: boolean;
  onSelect: (entryId: string) => void;
}) {
  // Wrap the click handler so the button can pass its specific entry id upward.
  const handleSelect = useCallback(() => {
    onSelect(row.assignment.entryId);
  }, [onSelect, row.assignment.entryId]);
  // Memoize the inline style object so it is recreated only when the cluster id
  // changes. The dot color matches this entry's assigned cluster.
  const clusterDotStyle = useMemo(
    () => ({ backgroundColor: getClusterColor(row.assignment.clusterId) }),
    [row.assignment.clusterId],
  );

  return (
    // Full-width button makes the whole row clickable. The selected state uses a
    // blue border/background, while unselected rows use neutral hover styling.
    <button
      type="button"
      onClick={handleSelect}
      className={`w-full rounded-xl border p-3 text-left transition-colors ${
        isSelected
          ? "border-blue-500/40 bg-blue-500/10"
          : "border-slate-800 bg-slate-950/45 hover:border-slate-700 hover:bg-slate-900/80"
      }`}
    >
      {/* truncate keeps long team names from breaking the card width. */}
      <span className="block truncate text-xs font-black uppercase tracking-widest text-white">
        {row.assignment.teamName}
      </span>
      {/* These helper functions provide readable labels and fallback text, so the
          component does not need to know every possible backend field shape. */}
      <span className="mt-1 block truncate text-[10px] font-black uppercase tracking-widest text-slate-500">
        {getAssignmentSeasonLabel(row.assignment)}
      </span>
      <span className="mt-1 block truncate text-[10px] font-black uppercase tracking-widest text-slate-400">
        {getAssignmentTournamentLabel(row.assignment)}
      </span>
      {/* The colored cluster tag helps users connect this entry to the matching
          cluster color in nearby charts. */}
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
