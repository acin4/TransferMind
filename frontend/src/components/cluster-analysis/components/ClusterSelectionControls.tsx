import { memo } from "react";
import type { ClusterSelectionControlsProps } from "../types";
import { getClusterColor } from "../utils/clusterChartUtils";
import { getClusterFilterButtonClass } from "../utils/clusterFormatters";

// memo prevents this button bar from re-rendering unless its props change.
// The component is presentational: selection state lives in the parent chart.
export const ClusterSelectionControls = memo(function ClusterSelectionControls({
  // profiles is the list of clusters the user can select for closer inspection.
  // Each profile also includes members, which lets the button show entry counts.
  profiles,
  // selectedClusterIds stores which cluster profile buttons are currently active.
  selectedClusterIds,
  // onSelect is called when the user clicks a cluster button.
  // The parent decides whether this toggles the cluster on or off.
  onSelect,
  // onClear clears every selected cluster in the parent component.
  onClear,
}: ClusterSelectionControlsProps) {
  return (
    // The controls wrap onto multiple lines on narrow screens, keeping buttons
    // accessible without horizontal overflow.
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {profiles.map((profile) => (
        // One button per cluster profile. clusterId is stable and unique here,
        // so React can use it to track each button between renders.
        <button
          key={profile.clusterId}
          type="button"
          // Clicking a button tells the parent which cluster should be selected
          // or deselected.
          onClick={() => onSelect(profile.clusterId)}
          // The shared class helper gives selected and unselected cluster buttons
          // consistent styling across cluster analysis controls.
          className={getClusterFilterButtonClass(
            selectedClusterIds.includes(profile.clusterId),
          )}
        >
          {/* The dot color matches the chart line for this cluster, helping users
              connect the control to the visualized profile. */}
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: getClusterColor(profile.clusterId) }}
          />
          {/* Showing the member count helps users know how much data contributes
              to each cluster before selecting it. */}
          Cluster {profile.clusterId} · {profile.members.length} entries
        </button>
      ))}
      {/* The clear button is only shown when there is something to clear. This
          keeps the UI simpler when no cluster is selected. */}
      {selectedClusterIds.length === 0 ? null : (
        <button
          type="button"
          // Clicking this resets the selected cluster list in the parent chart.
          onClick={onClear}
          // This button uses neutral styling because it is an action, not a
          // cluster-specific option.
          className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:border-slate-700 hover:bg-slate-900 hover:text-slate-100"
        >
          Clear selection
        </button>
      )}
    </div>
  );
});
