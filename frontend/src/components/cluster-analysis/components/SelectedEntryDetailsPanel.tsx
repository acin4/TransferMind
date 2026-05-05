import { memo } from "react";
import type { SelectedEntryDetailsPanelProps } from "../types";
import {
  getAssignmentSeasonLabel,
  getAssignmentTournamentLabel,
} from "../utils/clusterFormatters";

export const SelectedEntryDetailsPanel = memo(function SelectedEntryDetailsPanel({
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
