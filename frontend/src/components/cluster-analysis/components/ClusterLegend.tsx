import { memo } from "react";
import type { ClusterLegendProps } from "../types";
import { getClusterColor } from "../utils/clusterChartUtils";

// memo is useful for this small presentational component because the legend only
// needs to re-render when its list of cluster items changes.
export const ClusterLegend = memo(function ClusterLegend({
  // items is the list of clusters that should appear in the legend.
  // The parent decides the order, usually sorted by cluster id for consistency.
  items,
}: ClusterLegendProps) {
  return (
    // flex-wrap allows legend items to move onto a new line on smaller screens
    // instead of overflowing outside the chart header.
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        // One legend label is rendered for each cluster. clusterId is stable and
        // unique in this list, so it works well as the React key.
        <span
          key={item.clusterId}
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400"
        >
          {/* The dot uses the same cluster color as the chart lines, helping the
              user connect the legend label to the visual data. */}
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
