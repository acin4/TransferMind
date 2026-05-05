import { memo } from "react";
import type { ClusterLegendProps } from "../types";
import { getClusterColor } from "../utils/clusterChartUtils";

export const ClusterLegend = memo(function ClusterLegend({
  items,
}: ClusterLegendProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.clusterId}
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400"
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: getClusterColor(item.clusterId) }}
          />
          Cluster {item.clusterId}
        </span>
      ))}
    </div>
  );
});
