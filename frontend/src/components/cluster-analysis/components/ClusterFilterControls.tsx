import { memo } from "react";
import type { ClusterFilterControlsProps } from "../types";
import { getClusterColor } from "../utils/clusterChartUtils";
import { getClusterFilterButtonClass } from "../utils/clusterFormatters";

export const ClusterFilterControls = memo(function ClusterFilterControls({
  options,
  value,
  onChange,
}: ClusterFilterControlsProps) {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange("all")}
        className={getClusterFilterButtonClass(value === "all")}
      >
        All clusters
      </button>
      {options.map((option) => (
        <button
          key={option.clusterId}
          type="button"
          onClick={() => onChange(option.clusterId)}
          className={getClusterFilterButtonClass(value === option.clusterId)}
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
