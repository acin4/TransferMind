import { memo } from "react";
import type { ClusterFilterControlsProps } from "../types";
import { getClusterColor } from "../utils/clusterChartUtils";
import { getClusterFilterButtonClass } from "../utils/clusterFormatters";

// memo keeps this small control bar from re-rendering unless its props change.
// The parent owns the actual filter state; this component only displays buttons
// and reports which button the user clicked.
export const ClusterFilterControls = memo(function ClusterFilterControls({
  // options contains the clusters that can be used as filters.
  // Each option usually represents one cluster from the current analysis result.
  options,
  // selectedClusterIds stores which cluster filters are active right now.
  // An empty array means the UI is showing all clusters.
  selectedClusterIds,
  // onToggle is called when the user clicks a specific cluster button.
  // The parent decides whether that id should be added or removed.
  onToggle,
  // onClear is called when the user clicks "All clusters" to remove filters.
  onClear,
}: ClusterFilterControlsProps) {
  return (
    // flex-wrap lets the filter buttons move onto new lines on smaller screens
    // instead of overflowing horizontally.
    <div className="mb-5 flex flex-wrap gap-2">
      <button
        type="button"
        // Clicking this resets the filter back to the unfiltered "all" view.
        onClick={onClear}
        // The button appears active when no specific clusters are selected.
        className={getClusterFilterButtonClass(selectedClusterIds.length === 0)}
      >
        All clusters
      </button>
      {options.map((option) => (
        // One button is rendered for each available cluster. The cluster id is a
        // stable key because each cluster appears only once in the filter list.
        <button
          key={option.clusterId}
          type="button"
          // Wrapping the callback lets us pass this specific cluster id to the
          // parent when the user clicks the button.
          onClick={() => onToggle(option.clusterId)}
          // The class helper applies the active/inactive visual style based on
          // whether this cluster id is currently selected.
          className={getClusterFilterButtonClass(
            selectedClusterIds.includes(option.clusterId),
          )}
        >
          {/* The colored dot matches the color used for this cluster in charts,
              making the filter button easier to connect to the visualization. */}
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: getClusterColor(option.clusterId) }}
          />
          Cluster {option.clusterId}
        </button>
      ))}
    </div>
  );
});
