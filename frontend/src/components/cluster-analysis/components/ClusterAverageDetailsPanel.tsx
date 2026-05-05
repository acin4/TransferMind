import { memo } from "react";
import type { ClusterAverageDetailsPanelProps } from "../types";
import {
  formatInsightLabels,
  formatNormalizedStatValue,
} from "../utils/clusterFormatters";

export const ClusterAverageDetailsPanel = memo(function ClusterAverageDetailsPanel({
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
