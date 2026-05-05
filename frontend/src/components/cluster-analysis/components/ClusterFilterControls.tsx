import { memo } from "react";
import type { ClusterFilterControlsProps } from "../types";
import { getClusterColor } from "../utils/clusterChartUtils";
import { getClusterFilterButtonClass } from "../utils/clusterFormatters";

export const ClusterFilterControls = memo(function ClusterFilterControls({
  options,
  selectedClusterIds,
  onToggle,
  onClear,
}: ClusterFilterControlsProps) {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onClear}
        className={getClusterFilterButtonClass(selectedClusterIds.length === 0)}
      >
        All clusters
      </button>
      {options.map((option) => (
        <button
          key={option.clusterId}
          type="button"
          onClick={() => onToggle(option.clusterId)}
          className={getClusterFilterButtonClass(
            selectedClusterIds.includes(option.clusterId),
          )}
        >
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
