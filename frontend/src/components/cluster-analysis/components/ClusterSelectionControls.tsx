import { memo } from "react";
import type { ClusterSelectionControlsProps } from "../types";
import { getClusterColor } from "../utils/clusterChartUtils";
import { getClusterFilterButtonClass } from "../utils/clusterFormatters";

export const ClusterSelectionControls = memo(function ClusterSelectionControls({
  profiles,
  selectedClusterId,
  onSelect,
  onClear,
}: ClusterSelectionControlsProps) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {profiles.map((profile) => (
        <button
          key={profile.clusterId}
          type="button"
          onClick={() => onSelect(profile.clusterId)}
          className={getClusterFilterButtonClass(
            selectedClusterId === profile.clusterId,
          )}
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: getClusterColor(profile.clusterId) }}
          />
          Cluster {profile.clusterId} · {profile.members.length} entries
        </button>
      ))}
      {selectedClusterId == null ? null : (
        <button
          type="button"
          onClick={onClear}
          className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:border-slate-700 hover:bg-slate-900 hover:text-slate-100"
        >
          Clear selection
        </button>
      )}
    </div>
  );
});
